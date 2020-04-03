import * as dynamoDao from '../src/dynamoDao';
import * as gameManager from '../src/gameManager';
import * as idMinter from '../src/idMinter';
import { exitCode } from 'process';

describe('gameManager', () => {
    const newlyMintedId = 'abc123';
    const sampleUserId = 'userId';
    const sampleNickName = "Ronnie";

    const dateTimeEpoch = 795329084000;
    const dateTimeString = new Date(dateTimeEpoch).toISOString();

    const idMinterSpy = jest.spyOn(idMinter, 'mint');
    const dateSpy = jest.spyOn(Date, 'now');
    const putSpy = jest.spyOn(dynamoDao, 'put');
    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');

    beforeEach(() => {
        dateSpy.mockImplementation(() => dateTimeEpoch);
        idMinterSpy.mockImplementation(() => newlyMintedId);
        putSpy.mockImplementation((arg: dynamoDao.DynamoItem) => 
            Promise.resolve()
        );
    });

    afterEach(() => {
        idMinterSpy.mockClear();
        dateSpy.mockClear();
        putSpy.mockClear();
        getByKeySpy.mockClear();
    });

    describe('createNewGame', () => {
        const expectedUserGameItem = {
            PartitionKey: sampleUserId,
            SortKey: "CREATED|" + newlyMintedId,
            Gsi: newlyMintedId,
            GsiSortKey: sampleUserId,
            Nickname: sampleNickName,
            Host: true,
            Score: 0,
            CreatedDateTime: dateTimeString
        } as gameManager.GameItemDynamoDB;
        const expectedCreateGameResponse = {
            userId: sampleUserId,
            gameId: newlyMintedId
        };

        it('calls dynamoDao with correct params', async () => {
            await gameManager.createNewGame({
                userId: sampleUserId,
                nickname: sampleNickName
            });

            expect(putSpy).toHaveBeenCalledTimes(1);
            expect(putSpy).toHaveBeenCalledWith(expectedUserGameItem);
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
            PartitionKey: sampleUserId,
            SortKey: "CREATED|" + sampleGameId,
            Gsi: sampleGameId,
            GsiSortKey: sampleUserId,
            Nickname: sampleNickName,
            Host: false,
            Score: 0,
            CreatedDateTime: dateTimeString
        } as gameManager.GameItemDynamoDB;
        const expectedJoinGameResponse = {
            userId: sampleUserId,
            gameId: sampleGameId
        };

        const putSpy = jest.spyOn(dynamoDao, 'put');
 
        beforeEach(() => {
            putSpy.mockImplementation((arg: dynamoDao.DynamoItem) => 
                Promise.resolve()
            );
        })

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
        
        const expectedGetGameResponse = {
            host: {
                userId: hostUserId,
            },
            gameId: newlyMintedId,
            players: [
                {
                    userId: hostUserId,
                    nickname: userId1Nickname,
                    score: score1
                }, 
                {
                    userId: otherUserId,
                    nickname: userId2Nickname,
                    score: score2
                }
            ]
        } as gameManager.GetGameResponse;

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([{
                    PartitionKey: hostUserId,
                    Nickname: userId1Nickname,
                    Score: score1,
                    Host: true
                } as {[key: string]: any; },
                {
                    PartitionKey: otherUserId,
                    Nickname: userId2Nickname,
                    Score: score2,
                    Host: false
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
                indexName: dynamoDao.GSI_KEY, 
                indexValue: newlyMintedId
            });
        });
    });

    describe('getGamesForUser', () => {
        const userId = 'William';
        const gameId1 = 'Game1';
        const gameId2 = 'Game2';
        const state = 'PENDING';
        
        const expectedGetGameResponse = {
            games: [
                {
                    userId: userId,
                    gameId: gameId1
                },
                {
                    userId: userId,
                    gameId: gameId2
                }
            ]
        } as gameManager.GetGamesForUserResponse;

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([{
                    PartitionKey: userId,
                    Gsi: gameId1
                } as {[key: string]: any; },
                {
                    PartitionKey: userId,
                    Gsi: gameId2
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
                    indexName: dynamoDao.PRIMARY_KEY, 
                    indexValue: userId
                }, undefined);
            });
    
        });

        describe('when the state is given', () => {
            it('returns the expected result', async () => {
                const gameResponse = await gameManager.getGamesForUser(userId, state);
    
                expect(gameResponse).toStrictEqual(expectedGetGameResponse)
            });
    
            it('calls the correct dao methods', async () => {
                await gameManager.getGamesForUser(userId, state);
    
                expect(getByKeySpy).toBeCalledTimes(1);
                expect(getByKeySpy).toBeCalledWith({
                    indexName: dynamoDao.PRIMARY_KEY, 
                    indexValue: userId
                }, 
                {
                    sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
                    sortKeyPrefix: state
                });
            });

        });
    });

});