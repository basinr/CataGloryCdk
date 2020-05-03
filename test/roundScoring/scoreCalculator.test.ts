import * as dynamoDao from '../../src/dao/dynamoDao';
import * as answerManager from "../../src/manager/answerManager";
import { GameStates, GamePrefix, GameItemDynamoDB } from "../../src/manager/gameManager";
import { AnswerPrefix } from "../../src/manager/answerManager";
import { GameScore } from "../../src/roundScoring/roundScorerManager";
import { calculate } from '../../src/roundScoring/scoreCalculator';

describe('score', () => {
    const letter = 'c';
    const category1 = 'animal';
    const gameId = '123';
    const round = 1;
    const userId1 = 'userId1';
    const userId2 = 'userId2';
    const userId3 = 'userId3';
    const nickName1 = 'nickname1';
    const nickName2 = 'nickname2';
    const nickName3 = 'nickname3';

    const initialScores = {
        scores: [
            {
                userId: userId1,
                score: 1,
                nickname: nickName1
            },
            {
                userId: userId2,
                score: 2,
                nickname: nickName2
            }
        ]
    };

    const getByKeySpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const getQuestionsSpy = jest.spyOn(answerManager, 'getQuestions');

    afterEach(() => {
        getByKeySpy.mockClear();
        getQuestionsSpy.mockClear();
    });

    beforeEach(() => {
        getQuestionsSpy.mockImplementation((gameId: string, round: number) => {
            return Promise.resolve({
                letter: letter,
                categories: [category1],
                round: round
            });
        });
    });

    describe('initial scores is empty', () => {
        const emptyInitialScores = {
            scores: []
        };

        describe('2 answers are the same', () => {
            const answer = "Cat";
    
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                      return Promise.resolve([
                        createAnswerDynamoItem(userId1, answer),
                        createAnswerDynamoItem(userId2, answer)
                    ]);
                });
            });
            it('will return the same initial scores', async () => {
                const userGames = [ 
                    createWaitingDynamoItem(userId1, nickName1, emptyInitialScores),
                    createWaitingDynamoItem(userId2, nickName2, emptyInitialScores)
                ];
    
                const calculatedScores = await calculate(gameId, round, userGames);
            
                expect(calculatedScores).toStrictEqual({
                    scores: [{
                        userId: userId1,
                        nickname: nickName1,
                        score: 0
                    }, {
                        userId: userId2,
                        nickname: nickName2,
                        score: 0
                    }]
                });
            });
        });    
    
        describe('2 answers are different', () => {
            const answer1 = "Cat";
            const answer2 = "Cougar";
    
            beforeEach(() => {
                getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                      return Promise.resolve([
                        createAnswerDynamoItem(userId1, answer1),
                        createAnswerDynamoItem(userId2, answer2)
                    ]);
                });
            });
            it('will return correct new scores', async () => {
                const userGames = [ 
                    createWaitingDynamoItem(userId1, nickName1, emptyInitialScores),
                    createWaitingDynamoItem(userId2, nickName2, emptyInitialScores)
                ];
    
                const calculatedScores = await calculate(gameId, round, userGames);
    
                const updatedScores = {
                    scores: initialScores.scores.map(initalScore => {
                        return {
                            ...initalScore,
                            score: initalScore.score + 1
                        }
                    })
                }
            
                expect(calculatedScores).toStrictEqual({
                    scores: [{
                        userId: userId1,
                        nickname: nickName1,
                        score: 1
                    }, {
                        userId: userId2,
                        nickname: nickName2,
                        score: 1
                    }]
                });
            });
        });    
    });

    describe('2 answers are the same', () => {
        const answer = "Cat";

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([
                    createAnswerDynamoItem(userId1, answer),
                    createAnswerDynamoItem(userId2, answer)
                ]);
            });
        });
        it('will return the same initial scores', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);
        
            expect(calculatedScores).toStrictEqual(initialScores);
        });
    });

    describe('2 answers are the same but different case', () => {
        const answer1 = "Cat";
        const answer2 = "cAT";

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([
                    createAnswerDynamoItem(userId1, answer1),
                    createAnswerDynamoItem(userId2, answer2)
                ]);
            });
        });
        it('will return the same initial scores', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);
        
            expect(calculatedScores).toStrictEqual(initialScores);
        });
    });


    describe('2 answers are different', () => {
        const answer1 = "Cat";
        const answer2 = "Cougar";

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([
                    createAnswerDynamoItem(userId1, answer1),
                    createAnswerDynamoItem(userId2, answer2)
                ]);
            });
        });
        it('will return correct new scores', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);

            const updatedScores = {
                scores: initialScores.scores.map(initalScore => {
                    return {
                        ...initalScore,
                        score: initalScore.score + 1
                    }
                })
            }
        
            expect(calculatedScores).toStrictEqual(updatedScores);
        });
    });

    describe('answer does not start with correct letter', () => {
        const wrongAnswer1 = 'horse';
        const wrongAnswer2 = 'lizard';

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([
                    createAnswerDynamoItem(userId1, wrongAnswer1),
                    createAnswerDynamoItem(userId2, wrongAnswer2),
                ]);
            });
        });

        it('will return correct new scores', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);

            const updatedScores = {
                scores: initialScores.scores.map(initalScore => {
                    return {
                        ...initalScore,
                        score: initalScore.score
                    }
                })
            }
        
            expect(calculatedScores).toStrictEqual(updatedScores);
        });
    });

    describe('user did not input an answer', () => {

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([]);
            });
        });

        it('will output the correct gameScore', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);

            expect(calculatedScores).toStrictEqual(initialScores);
        });
    });

    describe('multiple answers', () => {
        const initialScores = {
            scores: [
                {
                    userId: userId1,
                    score: 1,
                    nickname: nickName1
                },
                {
                    userId: userId2,
                    score: 2,
                    nickname: nickName2
                },
                {
                    userId: userId3,
                    score: 0,
                    nickname: nickName3
                }
            ]
        };
        const expectedScores = {
            scores: [
                {
                    userId: userId1,
                    score: 5,
                    nickname: nickName1
                },
                {
                    userId: userId2,
                    score: 5,
                    nickname: nickName2
                },
                {
                    userId: userId3,
                    score: 1,
                    nickname: nickName3
                }
            ]
        };

        beforeEach(() => {
            getByKeySpy.mockImplementation((index: dynamoDao.IndexQuery, sort?: dynamoDao.SortKeyQuery) => {
                  return Promise.resolve([
                      createAnswerDynamoItem(userId1, 'cat', 0),
                      createAnswerDynamoItem(userId2, 'cat', 0),
                      createAnswerDynamoItem(userId3, 'CaT', 0),

                      createAnswerDynamoItem(userId1, 'chick', 1),
                      createAnswerDynamoItem(userId2, 'cougar', 1),
                      createAnswerDynamoItem(userId3, 'chicken', 1),

                      createAnswerDynamoItem(userId1, 'cat', 2),
                      createAnswerDynamoItem(userId2, 'cougar', 2),
                      
                      createAnswerDynamoItem(userId1, 'cat dog', 3),
                      createAnswerDynamoItem(userId2, 'cat', 3),
                      createAnswerDynamoItem(userId3, 'dog', 3),

                      createAnswerDynamoItem(userId1, 'cougar', 4),
                      createAnswerDynamoItem(userId2, 'cat', 4),
                      createAnswerDynamoItem(userId3, 'cat', 4),
                  ]);
            });

            getQuestionsSpy.mockImplementation((gameId: string, round: number) => {
                return Promise.resolve({
                    letter: letter,
                    categories: [category1, category1, category1, category1, category1],
                    round: round
                });
            });    
        });

        it('will output the correct gameScore', async () => {
            const userGames = [ 
                createWaitingDynamoItem(userId1, nickName1, initialScores),
                createWaitingDynamoItem(userId2, nickName2, initialScores),
                createWaitingDynamoItem(userId3, nickName3, initialScores)
            ];

            const calculatedScores = await calculate(gameId, round, userGames);

            expect(calculatedScores).toStrictEqual(expectedScores);

        });
    })

    const createWaitingDynamoItem = (userId: string, nickName: string, initialScores: GameScore): GameItemDynamoDB => {
        return {
            PartitionKey: userId,
            SortKey: GamePrefix + '|' + GameStates.Waiting + '|' + gameId,
            UserId: userId,
            GameId: gameId,
            Round: round,
            Host: true,
            Nickname: nickName,
            State: GameStates.Waiting,
            Scores: initialScores
        };
    };

    const createAnswerDynamoItem = (userId: string, answer: string, questionNumber: number = 0): answerManager.AnswerDynamoItem => {
        return {
            UserId: userId,
            QuestionNumber: questionNumber,
            PartitionKey: gameId,
            SortKey: AnswerPrefix + '|' + userId,
            GameId: gameId,
            Answer: answer,
            Round: round,
            Nickname: nickName1
        };
    };
});