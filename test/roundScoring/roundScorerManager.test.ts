import * as dynamoDao from '../../src/dao/dynamoDao';
import * as scoreCalculator from '../../src/roundScoring/scoreCalculator';
import * as gameManager from '../../src/manager/gameManager';
import { scoreRound, GameScore } from '../../src/roundScoring/roundScorerManager';
import { GameItemDynamoDB, GamePrefix, GameStates } from '../../src/manager/gameManager';

describe('roundScorerManager', () => {
    const sampleUserId = 'rbbasin';
    const sampleGameId = '123';
    const sampleNickname = 'RonnieB';
    const sampleRound = 1;

    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const scoreCalculatorSpy = jest.spyOn(scoreCalculator, 'calculate');
    const gameManagerSpy = jest.spyOn(gameManager, 'startNewRound');

    beforeEach(() => {
        gameManagerSpy.mockImplementation((...args) => Promise.resolve());
    })

    afterEach(() => {
        getByKeySpy.mockClear()
        scoreCalculatorSpy.mockClear();
        gameManagerSpy.mockClear();
    });

    describe('filtered out events', () => {
        const sampleNonWaitingGameItem= {
            PartitionKey: sampleUserId,
            SortKey: GamePrefix + '|' + GameStates.Waiting + '|' + sampleGameId,
            UserId: sampleUserId,
            GameId: sampleGameId,
            Round: sampleRound,
            Host: true,
            Nickname: sampleNickname,    
            State: GameStates.Pending,
            Scores: {
                scores: []
            }    
        } as GameItemDynamoDB;

        describe('event is not a game event', () => {
            const nonGameItem = {
                PartitionKey: 'randomItem',
                SortKey: 'sk'
            } as dynamoDao.DynamoItem;
            it('will not start the new round', async () => {
                await scoreRound(nonGameItem);

                expect(gameManagerSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('new item does have state, Waiting', () => {
        
            it('will not start the new round', async () => {
                await scoreRound(sampleNonWaitingGameItem);
                
                expect(gameManagerSpy).toHaveBeenCalledTimes(0);
            });
        });

        describe('player in the game is not done the round', () => {
            const sampleValidGameItem= {
                PartitionKey: sampleUserId,
                SortKey: GamePrefix + '|' + GameStates.Waiting + '|' + sampleGameId,
                UserId: sampleUserId,
                GameId: sampleGameId,
                Round: sampleRound,
                Host: true,
                Nickname: sampleNickname,
                State: GameStates.Waiting,
                Scores: {
                    scores: []
                }
            } as GameItemDynamoDB;
        
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                    Promise.resolve([
                        sampleValidGameItem as {[key: string]: any; },
                        sampleNonWaitingGameItem as {[key: string]: any; }
                    ])
                );
            });

            it('will not start the new round', async () => {
                await scoreRound(sampleValidGameItem);
                
                expect(gameManagerSpy).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('scoring needs to happen', () => {
        const userId1 = 'userId1';
        const userId2 = 'userId2';
        const round = 1;

        const calculatedGameScore = {
            scores: [
                {
                    userId: 'blah',
                    nickname: 'blah',
                    score: 1
                }
            ]
        };

        beforeEach(() => {
            scoreCalculatorSpy.mockImplementation((gameId, round, users) => Promise.resolve(calculatedGameScore));
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) =>
                Promise.resolve([
                    createWaitingDynamoItem(userId1),
                    createWaitingDynamoItem(userId2)
                ])
            );
        
            scoreRound(createWaitingDynamoItem(userId1));    
        });

        it('will start the new round with the score updated', () => {
            expect(gameManagerSpy).toHaveBeenCalledTimes(1);
            expect(gameManagerSpy).toHaveBeenCalledWith(
                createWaitingDynamoItem(userId1, calculatedGameScore), 
                createWaitingDynamoItem(userId2, calculatedGameScore)
            );
        });

        it('will calculate the score with the correct game items', () => {
            expect(scoreCalculatorSpy).toHaveBeenCalledTimes(1);
            expect(scoreCalculatorSpy).toHaveBeenCalledWith(
                sampleGameId,
                round,
                [ createWaitingDynamoItem(userId1), createWaitingDynamoItem(userId2) ]
            );
        });

        const createWaitingDynamoItem = (userId: string, userScores: GameScore = {scores:[]}): GameItemDynamoDB => {
            return {
                PartitionKey: sampleUserId,
                SortKey: GamePrefix + '|' + GameStates.Waiting + '|' + sampleGameId,
                UserId: userId,
                GameId: sampleGameId,
                Round: round,
                Host: true,
                Nickname: sampleNickname,
                State: GameStates.Waiting,
                Scores: userScores
            };
        };    
    });
});
