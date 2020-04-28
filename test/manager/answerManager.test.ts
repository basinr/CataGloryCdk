import * as dynamoDao from '../../src/dao/dynamoDao';
import { GameStates, GamePrefix } from '../../src/manager/gameManager';
import { defaultCategories } from '../../src/manager/defaultCategories';
import { putAnswer, AnswerPrefix, getQuestions, QuestionPrefx, getAnswers } from '../../src/manager/answerManager';

describe('answerManager', () => {
    describe('getQuestions', () => {
        const sampleGameId = 'game123';
        const sampleRound = 1;
        const sampleLetter = 'a';
        const sampleCategories = defaultCategories[1];

        const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');

        afterEach(() => {
            getByKeySpy.mockClear();
        });

        describe('questions exist', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([{
                        Letter: sampleLetter,
                        Categories: sampleCategories,
                        Round : sampleRound } as {[key: string]: any; },
                    ])
                );
            });
        
            it('calls dao with correct params', async () => {
                await getQuestions(sampleGameId, sampleRound);
        
                expect(getByKeySpy).toHaveBeenCalledTimes(1);
                expect(getByKeySpy).toHaveBeenCalledWith(
                    {
                        indexName: dynamoDao.PRIMARY_KEY,
                        indexValue: sampleGameId
                    },
                    {
                        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                        sortKeyPrefix: QuestionPrefx + '|' + sampleRound    
                    });
            });
        
            it('resolves with the correct response', async () => {
                await expect(getQuestions(sampleGameId, sampleRound)).resolves.toStrictEqual({
                    letter: sampleLetter,
                    categories: sampleCategories,
                    round: sampleRound
                });
            });    
        })


        describe('not questions exist', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([])
                );
            });

            it('throws an exception', async () => {
                await expect(getQuestions(sampleGameId, sampleRound)).rejects.toBeInstanceOf(Error);
            })
        });
    });

    describe('putAnswer', () => {
        const sampleUserId = 'userId';
        const sampleGameId = 'game123';
        const sampleRound = 1;
        const sampleAnswer = 'abc';
        const sampleQuestionNumber = 3;
        const dateTimeEpoch = 795329084000;
        const dateTimeString = new Date(dateTimeEpoch).toISOString();

        const dateSpy = jest.spyOn(Date, 'now');
        const putSpy = jest.spyOn(dynamoDao, 'put');
        const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');

        beforeEach(() => {
            dateSpy.mockImplementation(() => dateTimeEpoch);
            putSpy.mockImplementation((input: dynamoDao.DynamoItem) => Promise.resolve());
        })

        afterEach(() => {
            dateSpy.mockClear();
            putSpy.mockClear();
            getByKeySpy.mockClear();
        });

        describe('gameItem does not exist', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => Promise.resolve([]));
            });

            it('rejects this with an error', async () => {

                await expect(putAnswer({
                    userId: sampleUserId,
                    gameId: sampleGameId,
                    round: sampleRound,
                    questionNumber: sampleQuestionNumber,
                    answer: sampleAnswer
                })).rejects.toBeInstanceOf(Error);

                expect(getByKeySpy).toHaveBeenCalledTimes(1);
                expect(getByKeySpy).toHaveBeenCalledWith(
                    {
                        indexName: dynamoDao.PRIMARY_KEY,
                        indexValue: sampleUserId
                    },
                    {
                        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                        sortKeyPrefix: GamePrefix + '|' + GameStates.Pending + '|' + sampleGameId    
                    });
            });
        });

        describe('gameItem exists', () => {
            beforeEach(async () => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => Promise.resolve([{
                    PartitionKey: sampleUserId,
                    SortKey: sampleGameId,
                    Round: sampleRound
                }]));

                await putAnswer({
                    userId: sampleUserId,
                    gameId: sampleGameId,
                    round: sampleRound,
                    questionNumber: sampleQuestionNumber,
                    answer: sampleAnswer
                });
            });

            it('queries for the correct key', () => {
                expect(getByKeySpy).toHaveBeenCalledTimes(1);
                expect(getByKeySpy).toHaveBeenCalledWith(
                    {
                        indexName: dynamoDao.PRIMARY_KEY,
                        indexValue: sampleUserId
                    },
                    {
                        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                        sortKeyPrefix: GamePrefix + '|' + GameStates.Pending + '|' + sampleGameId    
                    });
            });
        
            it('calls dao with correct params', () => {
                expect(putSpy).toHaveBeenCalledTimes(1);
                expect(putSpy).toHaveBeenCalledWith(
                    {
                        PartitionKey: sampleUserId,
                        SortKey: AnswerPrefix + '|' + sampleGameId + '|' + sampleRound + '|' + sampleQuestionNumber,
                        Gsi: sampleGameId,
                        GsiSortKey: AnswerPrefix + '|' + sampleRound + '|' + sampleUserId + '|' + sampleQuestionNumber,
                        CreatedDateTime: dateTimeString,
                        UserId: sampleUserId,
                        GameId: sampleGameId,
                        Round: sampleRound,
                        QuestionNumber: sampleQuestionNumber,
                        Answer: sampleAnswer
                    });
            });

            describe('gameItem exists with a different round', () => {
                beforeEach(async () => {
                    getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => Promise.resolve([{
                        PartitionKey: sampleUserId,
                        SortKey: sampleGameId,
                        Round: sampleRound + 1
                    }]));
                });
    
                it('rejects this with an error', async () => {
                    await expect(putAnswer({
                        userId: sampleUserId,
                        gameId: sampleGameId,
                        round: sampleRound,
                        questionNumber: sampleQuestionNumber,
                        answer: sampleAnswer
                    })).rejects.toBeInstanceOf(Error);
                });    
            });
        });
    });

    describe('getAnswers', () => {
        const sampleGameId = 'game123';
        const sampleRound = 1;

        const sampleUserId = "fred";
        const sampleUserId2 = "sarah";

        const sampleQuestionNumber = 1;
        const sampleQuestionNumber2 = 2;
        const sampleAnswer = "answer1";
        const sampleAnswer2 = "answer2";

        const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');

        afterEach(() => {
            getByKeySpy.mockClear();
        });

        describe('answers exist', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([
                        {
                            QuestionNumber: sampleQuestionNumber,
                            Answer: sampleAnswer,
                            UserId : sampleUserId } as {[key: string]: any; },
                        {
                            QuestionNumber: sampleQuestionNumber2,
                            Answer: sampleAnswer2,
                            UserId : sampleUserId2 } as {[key: string]: any; },
                    ])
                );
            });
        
            it('calls dao with correct params', async () => {
                await getAnswers({gameId: sampleGameId, round: sampleRound});
        
                expect(getByKeySpy).toHaveBeenCalledTimes(1);
                expect(getByKeySpy).toHaveBeenCalledWith(
                    {
                        indexName: dynamoDao.GSI_KEY,
                        indexValue: sampleGameId
                    },
                    {
                        sortKeyName: dynamoDao.GSI_SORT_KEY,
                        sortKeyPrefix: AnswerPrefix + '|' + sampleRound   
                    });
            });
        
            it('resolves with the correct response', async () => {
                await expect(getAnswers({gameId: sampleGameId, round: sampleRound})).resolves.toStrictEqual({answers: [
                    {
                        questionNumber: sampleQuestionNumber,
                        answer: sampleAnswer,
                        userId: sampleUserId
                    },
                    {
                        questionNumber: sampleQuestionNumber2,
                        answer: sampleAnswer2,
                        userId: sampleUserId2
                    }
                ]});
            });
        });

        describe('if answers do not exist', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([])
                );
            });

            it('throws an exception', async () => {
                await expect(getAnswers({gameId: sampleGameId, round: sampleRound})).rejects.toBeInstanceOf(Error);
            })
        });
    });
});

