import * as dynamoDao from '../src/dynamoDao';
import { QuestionPrefx, GameStates } from '../src/gameManager';
import { defaultCategories } from '../src/defaultCategories';
import { putAnswer, AnswerPrefix, getQuestions } from '../src/answerManager';

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
                        sortKeyPrefix: GameStates.Pending + '|' + sampleGameId + '|' + sampleRound    
                    });
            });
        });

        describe('gameItem exists', () => {
            beforeEach(async () => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => Promise.resolve([{
                    PartitionKey: sampleUserId,
                    SortKey: sampleGameId
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
                        sortKeyPrefix: GameStates.Pending + '|' + sampleGameId + '|' + sampleRound    
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
        });
    });
});

