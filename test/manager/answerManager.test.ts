import * as dynamoDao from '../../src/dao/dynamoDao';
import * as gameManager from '../../src/manager/gameManager';
import { GameStates, createGameItemGSISortKey } from '../../src/manager/gameManager';
import { defaultCategories } from '../../src/manager/defaultCategories';
import { putAnswer, AnswerPrefix, getQuestions, QuestionPrefx, getAnswers, reportAnswer, createAnswerDynamoSortKey } from '../../src/manager/answerManager';

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
        const sampleNickname = 'Willy';
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
                getByKeySpy.mockImplementation((index, sort?) => Promise.resolve([]));
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
                        indexName: dynamoDao.GSI_KEY,
                        indexValue: sampleUserId
                    },
                    {
                        sortKeyName: dynamoDao.GSI_SORT_KEY,
                        sortKeyPrefix: createGameItemGSISortKey(GameStates.Pending, sampleGameId)   
                    });
            });
        });

        describe('gameItem exists', () => {
            beforeEach(async () => {
                getByKeySpy.mockImplementation((index, sort?) => Promise.resolve([{
                    PartitionKey: sampleUserId,
                    SortKey: sampleGameId,
                    Round: sampleRound,
                    Nickname: sampleNickname
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
                        indexName: dynamoDao.GSI_KEY,
                        indexValue: sampleUserId
                    },
                    {
                        sortKeyName: dynamoDao.GSI_SORT_KEY,
                        sortKeyPrefix: createGameItemGSISortKey(GameStates.Pending, sampleGameId)
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
                        Answer: sampleAnswer,
                        Nickname: sampleNickname,
                        Strikes: []
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
        
        const sampleNickName1 = "willy";
        const sampleNickName2 = "ronnie";

        const strikes1 = 1;
        const strikes2 = 2;

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
                            UserId : sampleUserId,
                            Nickname: sampleNickName1,
                            Strikes: strikes1
                        } as {[key: string]: any; },
                        {
                            QuestionNumber: sampleQuestionNumber2,
                            Answer: sampleAnswer2,
                            UserId : sampleUserId2,
                            Nickname: sampleNickName2,
                            Strikes: strikes2
                        } as {[key: string]: any; },
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
                        userId: sampleUserId,
                        nickname: sampleNickName1,
                        strikes: strikes1
                    },
                    {
                        questionNumber: sampleQuestionNumber2,
                        answer: sampleAnswer2,
                        userId: sampleUserId2,
                        nickname: sampleNickName2,
                        strikes: strikes2
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

    describe('reportAnswer', () => {
        const gameId = '123';
        const round = 1;
        const hostId = 'host123';
        const nicknameHost = 'I am host';
        const violaterId = 'violater123';
        const violaterNickname = 'I am violater';
        const userId = 'userId123';
        const userNickname = 'I am user';
        const questionNumber = 4;

        const getGamesSpy = jest.spyOn(gameManager, 'getGame');
        const appendToValueSpy = jest.spyOn(dynamoDao, 'appendToValue');

        beforeEach(() => {
            appendToValueSpy.mockImplementation((pk, sk, attr, app) => Promise.resolve());
        });

        afterEach(() => {
            getGamesSpy.mockClear();
            appendToValueSpy.mockClear();
        });

        describe('user is not in game', () => {
            const getGameResponse: gameManager.GetGameResponse = {
                gameId: gameId,
                round: round,
                host: {
                    userId: hostId,
                    nickname: nicknameHost
                },
                players: [{
                    userId: violaterId,
                    nickname: violaterId,
                    state: gameManager.GameStates.Pending
                }]
            };

            beforeEach(() => {
                getGamesSpy.mockImplementation(game => Promise.resolve(getGameResponse));
            });

            it('throws an error and does not call appendToValue', async () => {
                await expect(reportAnswer(
                    userId,
                    violaterId,
                    gameId,
                    round,
                    questionNumber
                )).rejects.toBeInstanceOf(Error);

                expect(appendToValueSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('violater is not in game', () => {
            const getGameResponse: gameManager.GetGameResponse = {
                gameId: gameId,
                round: round,
                host: {
                    userId: hostId,
                    nickname: nicknameHost
                },
                players: [{
                    userId: userId,
                    nickname: userNickname,
                    state: gameManager.GameStates.Pending
                }]
            };

            beforeEach(() => {
                getGamesSpy.mockImplementation(game => Promise.resolve(getGameResponse));
            });

            it('throws an error and does not call appendToValue', async () => {
                await expect(reportAnswer(
                    userId,
                    violaterId,
                    gameId,
                    round,
                    questionNumber
                )).rejects.toBeInstanceOf(Error);

                expect(appendToValueSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('violator and user are in the game', () => {
            const getGameResponse: gameManager.GetGameResponse = {
                gameId: gameId,
                round: round,
                host: {
                    userId: hostId,
                    nickname: nicknameHost
                },
                players: [{
                    userId: userId,
                    nickname: userNickname,
                    state: gameManager.GameStates.Pending
                },{
                    userId: violaterId,
                    nickname: violaterNickname,
                    state: gameManager.GameStates.Pending
                }]
            };

            beforeEach(() => {
                getGamesSpy.mockImplementation(game => Promise.resolve(getGameResponse));
            });

            it('calls appendToValue with the correct params', async () => {
                await reportAnswer(
                    userId,
                    violaterId,
                    gameId,
                    round,
                    questionNumber);
                
                expect(appendToValueSpy).toHaveBeenCalledTimes(1);
                expect(appendToValueSpy).toHaveBeenCalledWith(
                    violaterId,
                    createAnswerDynamoSortKey(gameId, round, questionNumber),
                    'Strikes',
                    [userId]
                );
            });
        });
    });
});

