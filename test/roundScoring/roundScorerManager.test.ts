import * as dynamoDao from '../../src/dao/dynamoDao';
import * as scoreCalculator from '../../src/roundScoring/scoreCalculator';
import * as gameManager from '../../src/manager/gameManager';
import { scoreRound, GameScore } from '../../src/roundScoring/roundScorerManager';
import { GameItemDynamoDB, GameStates } from '../../src/manager/gameManager';

describe('roundScorerManager', () => {
    const sampleUserId = 'rbbasin';
    const sampleGameId = '123';
    const sampleNickname = 'RonnieB';
    const sampleRound = 1;

    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const scoreCalculatorSpy = jest.spyOn(scoreCalculator, 'calculate');
    const startNewRoundSpy = jest.spyOn(gameManager, 'startNewRound');

    const initialScore = {
        scores: []
    };
    const sampleNonWaitingGameItem= {
        PartitionKey: sampleGameId,
        SortKey: gameManager.createGameItemSortKey(sampleUserId),
        UserId: sampleUserId,
        GameId: sampleGameId,
        Round: sampleRound,
        Host: true,
        Nickname: sampleNickname,    
        GameState: GameStates.Pending,
        Scores: {
            scores: []
        },
        LastRoundScores: {
            scores: []
        }
    } as GameItemDynamoDB;

    beforeEach(() => {
        startNewRoundSpy.mockImplementation((...args) => Promise.resolve());
    })

    afterEach(() => {
        getByKeySpy.mockClear()
        scoreCalculatorSpy.mockClear();
        startNewRoundSpy.mockClear();
    });

    describe('filtered out events', () => {
        describe('event is not a game event', () => {
            const nonGameItem = {
                PartitionKey: 'randomItem',
                SortKey: 'sk'
            } as dynamoDao.DynamoItem;
            it('will not start the new round', async () => {
                await scoreRound(nonGameItem, nonGameItem);

                expect(startNewRoundSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('not around ending event', () => {
            it('will not start the new round', async () => {
                await scoreRound(sampleNonWaitingGameItem, sampleNonWaitingGameItem);
                
                expect(startNewRoundSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('player in the game is not done the round', () => {        
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([
                        createWaitingDynamoItem(sampleUserId) as {[key: string]: any; },
                        sampleNonWaitingGameItem as {[key: string]: any; }
                    ])
                );
            });

            it('will not start the new round', async () => {
                await scoreRound(sampleNonWaitingGameItem, createWaitingDynamoItem(sampleUserId));
                
                expect(startNewRoundSpy).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('scoring needs to happen', () => {
        const userId1 = 'userId1';
        const userId2 = 'userId2';
        

        const calculatedGameScore = {
            scores: [
                {
                    userId: 'blah',
                    nickname: 'blah',
                    score: 1
                }
            ]
        };

        beforeEach(async () => {
            scoreCalculatorSpy.mockImplementation((gameId, round, users) => Promise.resolve(calculatedGameScore));
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([
                    createWaitingDynamoItem(userId1),
                    createWaitingDynamoItem(userId2)
                ])
            );
        
            await scoreRound(sampleNonWaitingGameItem, createWaitingDynamoItem(userId1));    
        });

        it('will start the new round with the score updated', () => {
            expect(startNewRoundSpy).toHaveBeenCalledTimes(1);
            expect(startNewRoundSpy).toHaveBeenCalledWith(
                sampleGameId,
                sampleRound,
                initialScore,
                calculatedGameScore,
                userId1, 
                userId2
            );
        });

        it('will calculate the score with the correct game items', () => {
            expect(scoreCalculatorSpy).toHaveBeenCalledTimes(1);
            expect(scoreCalculatorSpy).toHaveBeenCalledWith(
                sampleGameId,
                sampleRound,
                [ createWaitingDynamoItem(userId1), createWaitingDynamoItem(userId2) ]
            );
        });

    });
    const createWaitingDynamoItem = (userId: string, userScores: GameScore = {scores:[]}): GameItemDynamoDB => {
        return {
            PartitionKey: sampleUserId,
            SortKey: gameManager.createGameItemSortKey(userId),
            UserId: userId,
            GameId: sampleGameId,
            Round: sampleRound,
            Host: true,
            Nickname: sampleNickname,
            GameState: GameStates.Waiting,
            Scores: userScores,
            LastRoundScores: initialScore
        };
    };    
});
