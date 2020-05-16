import { AnswerDynamoItem, createAnswerDynamoSortKey } from "../../src/manager/answerManager";
import {handleReportAnswerEvent} from '../../src/roundScoring/reportAnswerManager';
import * as gameManager from '../../src/manager/gameManager';
import * as dynamoDao from '../../src/dao/dynamoDao';
import * as scoreCalculator from '../../src/roundScoring/scoreCalculator';
import { DynamoItem } from "../../src/dao/dynamoDao";

describe('handleReportAnswerEvent', () => {
    const userId = 'userId123';
    const gameId = 'gameId123';
    const round = 1;
    const questionNumber = 0;
    const answer = 'answer';
    const nickname = 'willy';

    const updateScoreSpy = jest.spyOn(gameManager, 'updateScores');
    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const scoreCalculatorSpy = jest.spyOn(scoreCalculator, 'calculate');

    beforeEach(() => {
        updateScoreSpy.mockImplementation((score, game, ...userIds) => Promise.resolve());
    });

    afterEach(() => {
        updateScoreSpy.mockClear();
        getByKeySpy.mockClear();
        scoreCalculatorSpy.mockClear();
    });

    describe('not an answer event', () => {
        const item: DynamoItem ={
            PartitionKey: 'pk',
            SortKey: 'sk'
        }
        it('will not do anything', async () => {
            await handleReportAnswerEvent(item, item);

            expect(updateScoreSpy).toHaveBeenCalledTimes(0);
        });
    })

    describe('not a strike event', () => {
        const oldAnswerItem: AnswerDynamoItem ={
            PartitionKey: userId,
            SortKey: createAnswerDynamoSortKey(gameId, round, questionNumber),
            Gsi: gameId,
            GsiSortKey: 'sk',
            GameId: gameId,
            UserId: userId,
            Round: round,
            QuestionNumber: questionNumber,
            Answer: answer,
            Nickname: nickname,
            Strikes: []
        };

        it('will not do anything', async () => {
            await handleReportAnswerEvent(oldAnswerItem, oldAnswerItem);

            expect(updateScoreSpy).toHaveBeenCalledTimes(0);
        });
    });

    // TODO Right now the number of strikes is 1. This will change to another number
    // Update this test to run when that happensx
    xdescribe('not enough strikes to redo a score', () => {
        const oldAnswerItem: AnswerDynamoItem ={
            PartitionKey: userId,
            SortKey: createAnswerDynamoSortKey(gameId, round, questionNumber),
            Gsi: gameId,
            GsiSortKey: 'sk',
            GameId: gameId,
            UserId: userId,
            Round: round,
            QuestionNumber: questionNumber,
            Answer: answer,
            Nickname: nickname,
            Strikes: []
        };

        const newAnswerItem: AnswerDynamoItem ={
            PartitionKey: userId,
            SortKey: createAnswerDynamoSortKey(gameId, round, questionNumber),
            Gsi: gameId,
            GsiSortKey: 'sk',
            GameId: gameId,
            UserId: userId,
            Round: round,
            QuestionNumber: questionNumber,
            Answer: answer,
            Nickname: nickname,
            Strikes: ['asdf']
        };

        it('will not do anything', async () => {
            await handleReportAnswerEvent(oldAnswerItem, newAnswerItem);

            expect(updateScoreSpy).toHaveBeenCalledTimes(0);
        });

    });

    describe('valid event', () => {
        const oldAnswerItem: AnswerDynamoItem ={
            PartitionKey: userId,
            SortKey: createAnswerDynamoSortKey(gameId, round, questionNumber),
            Gsi: gameId,
            GsiSortKey: 'sk',
            GameId: gameId,
            UserId: userId,
            Round: round,
            QuestionNumber: questionNumber,
            Answer: answer,
            Nickname: nickname,
            Strikes: []
        };

        const newAnswerItem: AnswerDynamoItem ={
            PartitionKey: userId,
            SortKey: createAnswerDynamoSortKey(gameId, round, questionNumber),
            Gsi: gameId,
            GsiSortKey: 'sk',
            GameId: gameId,
            UserId: userId,
            Round: round,
            QuestionNumber: questionNumber,
            Answer: answer,
            Nickname: nickname,
            Strikes: ['asdf', 'asdfasdf']
        };

        const userId2 = 'userId123';

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
                    createWaitingDynamoItem(userId),
                    createWaitingDynamoItem(userId2)
                ])
            );
        
            await handleReportAnswerEvent(oldAnswerItem, newAnswerItem);    
        });

        it('will start the new round with the score updated', () => {
            expect(updateScoreSpy).toHaveBeenCalledTimes(1);
            expect(updateScoreSpy).toHaveBeenCalledWith(
                calculatedGameScore,
                gameId,
                userId, 
                userId2
            );
        });

        it('will calculate the score with the correct game items', () => {
            expect(scoreCalculatorSpy).toHaveBeenCalledTimes(1);
            expect(scoreCalculatorSpy).toHaveBeenCalledWith(
                gameId,
                round,
                [ createWaitingDynamoItem(userId), createWaitingDynamoItem(userId2) ]
            );
        });

        const createWaitingDynamoItem = (userId: string): gameManager.GameItemDynamoDB => {
            return {
                PartitionKey: userId,
                SortKey: gameManager.createGameItemSortKey(userId),
                UserId: userId,
                GameId: gameId,
                Round: round,
                Host: true,
                Nickname: 'adsf',
                GameState: gameManager.GameStates.Waiting,
                Scores: {scores:[]},
                LastRoundScores: {scores:[]}
            };
        };        
    });
});