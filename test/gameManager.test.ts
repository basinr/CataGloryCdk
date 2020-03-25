import * as dynamoDao from '../src/dynamoDao';
import * as gameManager from '../src/gameManager';
import * as idMinter from '../src/idMinter';
import { exitCode } from 'process';

describe('gameManager', () => {
    const newlyMintedId = 'abc123';
    const sampleUserId = 'userId';

    const dateTimeEpoch = 795329084000;
    const dateTimeString = new Date(dateTimeEpoch).toISOString();

    const idMinterSpy = jest.spyOn(idMinter, 'mint');
    const dateSpy = jest.spyOn(Date, 'now');
    const putSpy = jest.spyOn(dynamoDao, 'put');
    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByKey');

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
                userId: sampleUserId
            });

            expect(putSpy).toHaveBeenCalledTimes(1);
            expect(putSpy).toHaveBeenCalledWith(expectedUserGameItem);
        });

        it('returns with correct userId and gameid', async () => {
            const gameResponse = await gameManager.createNewGame({
                userId: sampleUserId
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
            Host: false,
            Score: 0,
            CreatedDateTime: dateTimeString
        } as gameManager.GameItemDynamoDB;
        const expectedCreateGameResponse = {
            userId: sampleUserId,
            gameId: newlyMintedId
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
                gameId: sampleGameId
            });

            expect(putSpy).toHaveBeenCalledTimes(1);
            expect(putSpy).toHaveBeenCalledWith(expectedUserGameItem);
        });

        it('returns with correct userId and gameid', async () => {
            const gameResponse = await gameManager.createNewGame({
                userId: sampleUserId
            });

            expect(gameResponse).toStrictEqual(expectedCreateGameResponse);
        });
    });

    describe('getGame', () => {
        const hostUserId = 'William';
        const otherUserId = 'Ronnie';
        const score1 = 1;
        const score2 = 0;
        
        const expectedGetGameResponse = {
            hostUserId: hostUserId,
            gameId: newlyMintedId,
            players: [
                {
                    userId: hostUserId,
                    score: score1
                } as gameManager.Player, 
                {
                    userId: otherUserId,
                    score: score2
                }
            ]
        } as gameManager.GetGameResponse;

        beforeEach(() => {
            getByKeySpy.mockImplementation((keyName: string, key: string) =>
                Promise.resolve([{
                    PartitionKey: hostUserId,
                    Score: score1,
                    Host: true
                } as {[key: string]: any; },
                {
                    PartitionKey: otherUserId,
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
            expect(getByKeySpy).toBeCalledWith(dynamoDao.GSI_KEY, newlyMintedId);
        });
    })
});