import * as dynamoDao from '../../src/dao/dynamoDao';
import * as gameManager from '../../src/manager/gameManager';
import * as idMinter from '../../src/manager/idMinter';
import * as randomLetterGenerator from '../../src/manager/randomLetterGenerator';
import { exitCode } from 'process';
import { defaultCategories } from '../../src/manager/defaultCategories';
import { QuestionPrefx, QuestionDynamoDB, createQuestionRecord } from '../../src/manager/answerManager';
import { GameScore } from '../../src/roundScoring/roundScorerManager';

describe('gameManager', () => {
    const newlyMintedId = 'abc123';
    const sampleUserId = 'userId';
    const sampleGameId = 'gameId';
    const sampleNickName = "Ronnie";
    const randomlyGeneratedLetter = 'a';

    const dateTimeEpoch = 795329084000;
    const dateTimeString = new Date(dateTimeEpoch).toISOString();

    const idMinterSpy = jest.spyOn(idMinter, 'mint');
    const randomLetterSpy = jest.spyOn(randomLetterGenerator, 'generate');
    const dateSpy = jest.spyOn(Date, 'now');
    const putSpy = jest.spyOn(dynamoDao, 'put');
    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const transactPutSpy = jest.spyOn(dynamoDao, 'transactPut');
    const bulkUpdateSpy = jest.spyOn(dynamoDao, 'bulkUpdateForParitionKey');

    beforeEach(() => {
        idMinterSpy.mockImplementation(() => newlyMintedId);
        randomLetterSpy.mockImplementation(() => randomlyGeneratedLetter);
        dateSpy.mockImplementation(() => dateTimeEpoch);
        putSpy.mockImplementation((arg) => Promise.resolve());
        transactPutSpy.mockImplementation((...arg) => Promise.resolve());
        bulkUpdateSpy.mockImplementation((oldItem, newItem) => Promise.resolve());
    });

    afterEach(() => {
        idMinterSpy.mockClear();
        dateSpy.mockClear();
        putSpy.mockClear();
        getByKeySpy.mockClear();
        transactPutSpy.mockClear();
        bulkUpdateSpy.mockClear();
    });

    describe('createNewGame', () => {
        const expectedUserGameItem = {
            PartitionKey: newlyMintedId,
            SortKey: gameManager.createGameItemSortKey(sampleUserId),
            Gsi: sampleUserId,
            GsiSortKey: gameManager.createGameItemGSISortKey(gameManager.GameStates.Pending, newlyMintedId),
            Nickname: sampleNickName,
            Round: 1,
            GameId: newlyMintedId,
            UserId: sampleUserId,
            Host: true,
            GameState: gameManager.GameStates.Pending,
            CreatedDateTime: dateTimeString,
            Scores: {
                scores: []
            },
            LastRoundScores: {
                scores: []
            }
        } as gameManager.GameItemDynamoDB;
        const expectedQuestion = {
            PartitionKey: newlyMintedId,
            SortKey: QuestionPrefx + '|' + 1,
            Letter: randomlyGeneratedLetter,
            Categories: defaultCategories[0],
            Round: 1,
            CreatedDateTime: dateTimeString
        } as QuestionDynamoDB;
        const expectedCreateGameResponse = {
            userId: sampleUserId,
            gameId: newlyMintedId
        };
        
        it('calls dynamoDao with correct params', async () => {
            await gameManager.createNewGame({
                userId: sampleUserId,
                nickname: sampleNickName
            });

            expect(transactPutSpy).toHaveBeenCalledTimes(1);
            expect(transactPutSpy).toHaveBeenCalledWith(expectedUserGameItem, expectedQuestion);
        });

        it('returns with correct userId and gameid', async () => {
            const gameResponse = await gameManager.createNewGame({
                userId: sampleUserId,
                nickname: sampleNickName
            });

            expect(gameResponse).toMatchObject(expectedCreateGameResponse);
        });
    });

    describe('joinGame', () => {
        const sampleUserId = 'userId';
        const sampleGameId = 'gameId';

        const expectedUserGameItem = {
            PartitionKey: sampleGameId,
            SortKey: gameManager.createGameItemSortKey(sampleUserId),
            Gsi: sampleUserId,
            GsiSortKey: gameManager.createGameItemGSISortKey(gameManager.GameStates.Pending, sampleGameId),
            Nickname: sampleNickName,
            Round: 1,
            GameId: sampleGameId,
            UserId: sampleUserId,
            Host: false,
            GameState: gameManager.GameStates.Pending,
            CreatedDateTime: dateTimeString,
            Scores: {
                scores: []
            },
            LastRoundScores: {
                scores: []
            }
        } as gameManager.GameItemDynamoDB;
        const expectedJoinGameResponse = {
            userId: sampleUserId,
            gameId: sampleGameId
        };

         it('calls dynamoDao with correct params', async () => {
            await gameManager.joinGame({
                userId: sampleUserId,
                gameId: sampleGameId,
                nickname: sampleNickName
            });

            expect(putSpy).toHaveBeenCalledTimes(1);
            expect(putSpy).toHaveBeenCalledWith(expectedUserGameItem);
        });

        it('returns with correct userId and gameid', async () => {
            const gameResponse = await gameManager.joinGame({
                userId: sampleUserId,
                gameId: sampleGameId,
                nickname: sampleNickName
            });

            expect(gameResponse).toStrictEqual(expectedJoinGameResponse);
        });
    });

    describe('getGame', () => {
        const hostUserId = '1234';
        const userId1Nickname = 'William';
        const otherUserId = '4567';
        const userId2Nickname = 'Ronnie';
        const score1 = 1;
        const score2 = 0;
        const sampleRound = 1;
        const state = gameManager.GameStates.Pending;
        
        const expectedGetGameResponse = {
            host: {
                userId: hostUserId,
                nickname: userId1Nickname
            },
            gameId: newlyMintedId,
            round: sampleRound,
            players: [
                {
                    userId: hostUserId,
                    nickname: userId1Nickname,
                    state: state
                }, 
                {
                    userId: otherUserId,
                    nickname: userId2Nickname,
                    state: state
                }
            ]
        } as gameManager.GetGameResponse;

        beforeEach(() => {
            getByKeySpy.mockImplementation((index, sort?) =>
                Promise.resolve([{
                    PartitionKey: hostUserId,
                    Nickname: userId1Nickname,
                    Score: score1,
                    Host: true,
                    UserId: hostUserId,
                    Round: sampleRound,
                    GameState: state
                } as {[key: string]: any; },
                {
                    PartitionKey: otherUserId,
                    Nickname: userId2Nickname,
                    Score: score2,
                    Host: false,
                    UserId: otherUserId,
                    Round: sampleRound,
                    GameState: state
                }as {[key: string]: any; }
            ]));
        });

        it('returns the expected', async () => {
            const gameResponse = await gameManager.getGame({
                gameId: newlyMintedId
            });

            expect(gameResponse).toStrictEqual(expectedGetGameResponse)
        });

        it('calls the correct dao methods', async () => {
            await gameManager.getGame({
                gameId: newlyMintedId
            });

            expect(getByKeySpy).toBeCalledTimes(1);
            expect(getByKeySpy).toBeCalledWith({
                indexName: dynamoDao.PRIMARY_KEY, 
                indexValue: newlyMintedId
            },{
                sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                sortKeyPrefix: gameManager.createGameItemSortKey()
            });
        });
    });

    describe('getGamesForUser', () => {
        const userId = 'William';
        const gameId1 = 'Game1';
        const gameId2 = 'Game2';
        const sampleState = gameManager.GameStates.Pending;
        const sampleRound = 1;
        const sampleScores1 = {
            scores: []
        } as GameScore;
        const sampleScores2 = {
            scores: [
                {
                    userId: 'bulovaw',
                    nickname: "willy",
                    score: 1000
                },
                {
                    userId: 'rbbasin',
                    nickname: 'RonnieLoser',
                    score: 0
                }
            ]
        } as GameScore;
        
        const expectedGetGameResponse = {
            games: [
                {
                    userId: userId,
                    gameId: gameId1,
                    round: sampleRound,
                    state: sampleState,
                    scores: sampleScores1
                },
                {
                    userId: userId,
                    gameId: gameId2,
                    round: sampleRound,
                    state: sampleState,
                    scores: sampleScores2
                }
            ]
        } as gameManager.GetGamesForUserResponse;

        beforeEach(() => {
            getByKeySpy.mockImplementation((index, sort?) =>
                Promise.resolve([{
                    PartitionKey: userId,
                    Gsi: gameId1,
                    UserId: userId,
                    GameId: gameId1,
                    Round: sampleRound,
                    GameState: sampleState,
                    Scores: sampleScores1
                } as {[key: string]: any; },
                {
                    PartitionKey: userId,
                    Gsi: gameId2,
                    UserId: userId,
                    GameId: gameId2,
                    Round: sampleRound,
                    GameState: sampleState,
                    Scores: sampleScores2
                }as {[key: string]: any; }
            ]));
        });

        describe ('when the state is not given', () => {
            it('returns the expected result', async () => {
                const gameResponse = await gameManager.getGamesForUser(userId);
    
                expect(gameResponse).toStrictEqual(expectedGetGameResponse)
            });
    
            it('calls the correct dao methods', async () => {
                await gameManager.getGamesForUser(userId);
    
                expect(getByKeySpy).toBeCalledTimes(1);
                expect(getByKeySpy).toBeCalledWith({
                    indexName: dynamoDao.GSI_KEY, 
                    indexValue: userId
                }, {
                    sortKeyName: dynamoDao.GSI_SORT_KEY,
                    sortKeyPrefix: gameManager.createPartialGameItemGSISortKey()
                });
            });
    
        });

        describe('when the state is given', () => {
            it('returns the expected result', async () => {
                const gameResponse = await gameManager.getGamesForUser(userId, sampleState);
    
                expect(gameResponse).toStrictEqual(expectedGetGameResponse)
            });
    
            it('calls the correct dao methods', async () => {
                await gameManager.getGamesForUser(userId, sampleState);
    
                expect(getByKeySpy).toBeCalledTimes(1);
                expect(getByKeySpy).toBeCalledWith({
                    indexName: dynamoDao.GSI_KEY, 
                    indexValue: userId
                }, 
                {
                    sortKeyName: dynamoDao.GSI_SORT_KEY,
                    sortKeyPrefix: gameManager.createPartialGameItemGSISortKey(sampleState)
                });
            });

        });
    });

    describe('endRound', () => {
        describe('when there exists a current round in PENDING', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index, sort?) =>
                    Promise.resolve([{
                        PartitionKey: sampleGameId,
                        SortKey: sampleUserId,
                        UserId: sampleUserId,
                        GameId: sampleGameId,
                        State: gameManager.GameStates.Pending
                        } as {[key: string]: any; },
                    ])
                );
            });

            it('queries for the correct rows', async () => {
                await gameManager.endRound({
                    userId: sampleUserId,
                    gameId: sampleGameId,
                });

                expect(getByKeySpy).toHaveBeenCalledTimes(1);
                expect(getByKeySpy).toHaveBeenCalledWith({
                    indexName: dynamoDao.GSI_KEY,
                    indexValue: sampleUserId
                }, {
                    sortKeyName: dynamoDao.GSI_SORT_KEY,
                    sortKeyPrefix: gameManager.createGameItemGSISortKey(gameManager.GameStates.Pending, sampleGameId)
                });
            });

            it('updates dynamo with the correct params', async () => {
                await gameManager.endRound({
                    userId: sampleUserId,
                    gameId: sampleGameId
                });

                expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
                expect(bulkUpdateSpy).toHaveBeenLastCalledWith(
                    sampleGameId,
                    [sampleUserId],
                    [{
                        name: dynamoDao.GSI_SORT_KEY,
                        value: gameManager.createGameItemGSISortKey(gameManager.GameStates.Waiting, sampleGameId)
                    },
                    {
                        name: 'GameState',
                        value: gameManager.GameStates.Waiting
                    }]
                );
            });
        })

        describe('when there does not exist a current round in PENDING', () => {
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([])
                );
            });

            it('throws an exception', async () => {
                await expect(gameManager.endRound({
                    userId: sampleUserId,
                    gameId: sampleGameId
                })).rejects.toBeInstanceOf(Error);
            });
        })
    });

    describe('startNewRound', () => {
        const userId1 = 'userId1';
        const userId2 = 'userId2';
        const userId3 = 'userId3';
        const updatedGameScore: GameScore = {
            scores: [
                {
                    userId: userId1,
                    nickname: 'blah',
                    score: 1
                },
                {
                    userId: userId2,
                    nickname: 'blah2',
                    score: 3
                },
                {
                    userId: userId3,
                    nickname: 'blah3',
                    score: 5
                }
            ]
        };
        const initialGameScore: GameScore = {
            scores: [
                {
                    userId: userId1,
                    nickname: 'blah',
                    score: 0
                },
                {
                    userId: userId2,
                    nickname: 'blah2',
                    score: 0
                },
                {
                    userId: userId3,
                    nickname: 'blah3',
                    score: 0
                }
            ]
        };
        
        const sampleRound = 1;

        beforeEach(() => {
            gameManager.startNewRound(
                sampleGameId,
                sampleRound,
                initialGameScore,
                updatedGameScore,
                userId1,
                userId2,
                userId3
            );
        });

        it('puts a new question for the round', () => {
            expect(putSpy).toHaveBeenCalledTimes(1);
            expect(putSpy).toHaveBeenCalledWith(createQuestionRecord(sampleGameId, sampleRound + 1, dateTimeString))
        });

        it('updates dynamo with the new keys', () => {
            expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
            expect(bulkUpdateSpy).toHaveBeenCalledWith(
                sampleGameId,
                [
                    gameManager.createGameItemSortKey(userId1), 
                    gameManager.createGameItemSortKey(userId2), 
                    gameManager.createGameItemSortKey(userId3)
                ],
                [
                    {
                        name: dynamoDao.GSI_SORT_KEY, 
                        value: gameManager.createGameItemGSISortKey(gameManager.GameStates.Pending, sampleGameId)                  
                    },
                    {
                        name: 'Round',
                        value: sampleRound + 1                  
                    },
                    {
                        name: 'GameState',
                        value: gameManager.GameStates.Pending
                    },
                    {
                        name: 'CreatedDateTime',
                        value: dateTimeString
                    },
                    {
                        name: 'Scores',
                        value: updatedGameScore
                    },
                    {
                        name: 'LastRoundScores',
                        value: initialGameScore
                    },
                ]    
            );
        })
    
        const createWaitingDynamoItem = (userId: string, round: number): gameManager.GameItemDynamoDB => {
            return {
                PartitionKey: sampleUserId,
                SortKey: 'gameManager.GamePrefix' + '|' + gameManager.GameStates.Waiting + '|' + sampleGameId,
                UserId: userId,
                GameId: sampleGameId,
                Round: round,
                Host: true,
                Nickname: sampleNickName,
                GameState: gameManager.GameStates.Waiting,
                Scores: updatedGameScore,
                LastRoundScores: initialGameScore
            };
        };    
    });

    describe('updateScores', () => {
        const sampleUserId2 = 'userId2';
        const sampleNickname2 = 'nickname2';

        const sampleGameScore: GameScore = {
            scores: [{
                userId: sampleUserId,
                nickname: sampleNickName,
                score: 4
            }, {
                userId: sampleUserId2,
                nickname: sampleNickname2,
                 score: 2
            }]
        }

        it('calls bulkUpdate with the correct params', async () => {
            await gameManager.updateScores(sampleGameScore, sampleGameId, sampleUserId, sampleUserId2);
            
            expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
            expect(bulkUpdateSpy).toHaveBeenCalledWith(
                sampleGameId,
                [
                    gameManager.createGameItemSortKey(sampleUserId),
                    gameManager.createGameItemSortKey(sampleUserId2)
                ],
                [{
                    name: 'Scores',
                    value: sampleGameScore
                }]
            );
        });
    });
});