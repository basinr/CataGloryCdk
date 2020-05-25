import * as dynamoDao from '../../src/dao/dynamoDao'
import { createCustomCategoryRecord, createCustomCategoriesSortKey, putCustomCategory, CustomCategoriesDynamoRecord, setupQuestionsForRounds } from "../../src/manager/questionManager";
import { appendToValue } from '../../src/dao/dynamoDao';
import { createQuestionSortKey } from '../../src/manager/answerManager';
import * as randomLetterGenerator from '../../src/manager/randomLetterGenerator';
import { defaultCategories } from '../../src/manager/defaultCategories';

describe('questionManager', () => {
    const gameId = 'gameId123';

    const getSpy = jest.spyOn(dynamoDao, 'getItemsByIndexAndSortKey');
    const putSpy = jest.spyOn(dynamoDao, 'transactPut');
    const randomSpy = jest.spyOn(Math, 'random');
    const randomLetterSpy = jest.spyOn(randomLetterGenerator, 'generate');

    afterEach(() => {
        getSpy.mockClear();
        putSpy.mockClear();
        randomSpy.mockClear();
    })

    describe('createCustomCategoryRecord', () => {
        it('creates the correct custom record', () => {
            const record = createCustomCategoryRecord(gameId);

            expect(record.GameId).toBe(gameId);
            expect(record.PartitionKey).toBe(gameId);
            expect(record.SortKey).toBe(createCustomCategoriesSortKey());
            expect(record.Categories).toStrictEqual([]);
        });
    });

    describe('putCustomCategory', () => {
        const customCategory = 'fruit';
        
        const appendSpy = jest.spyOn(dynamoDao, 'appendToValue');

        beforeEach(() => {
            appendSpy.mockImplementation(() => Promise.resolve());
        });

        afterEach(() => {
            appendSpy.mockClear();
        })

        it('calls append with the correct values', async () => {
            await putCustomCategory(gameId, customCategory);

            expect(appendSpy).toHaveBeenCalledTimes(1);
            expect(appendSpy).toHaveBeenCalledWith(
                gameId,
                createCustomCategoriesSortKey(),
                'Categories',
                [customCategory]
            );
        });
    });

    describe('setupQuestions', () => {
        const letterRound1 = 'a';
        const letterRound2 = 'b';
        const letterRound3 = 'c';

        beforeEach(() => {
            putSpy.mockImplementation(() => Promise.resolve());

            randomLetterSpy.mockImplementationOnce(() => letterRound1)
                .mockImplementationOnce(() => letterRound2)
                .mockImplementationOnce(() => letterRound3);
        });

        describe('when the game has at least 15 custom questions', () => {
            beforeEach(() => {
                const customCategories = [...Array(15).keys()].map(i => i.toString());

                console.log(JSON.stringify(customCategories));
    
                const customQuestions: CustomCategoriesDynamoRecord = {
                    PartitionKey: gameId,
                    SortKey: createCustomCategoriesSortKey(),
                    GameId: gameId,
                    Categories: customCategories
                };
            
                getSpy.mockImplementation((indexQuery, sortKeyQuery?) => 
                    Promise.resolve([customQuestions])
                );
    
                randomSpy.mockImplementation(() => 0)
            });
    
            it('will create three rounds of custom questions', async () =>{
                await setupQuestionsForRounds(gameId);

                expect(putSpy).toHaveBeenCalledTimes(1);
                expect(putSpy).toHaveBeenCalledWith(
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(1),
                        Round: 1,
                        Letter: letterRound1,
                        Categories: ['1', '2', '3', '4', '5'].map((value, index) => {
                            return { 
                                Category: value,
                                QuestionNumber: index
                            }
                        })
                    },
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(2),
                        Round: 2,
                        Letter: letterRound2,
                        Categories: ['6', '7', '8', '9', '10'].map((value, index) => {
                            return { 
                                Category: value,
                                QuestionNumber: index
                            }
                        })
                    },
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(3),
                        Round: 3,
                        Letter: letterRound3,
                        Categories: ['11', '12', '13', '14', '0'].map((value, index) => {
                            return { 
                                Category: value,
                                QuestionNumber: index
                            }
                        })
                    }
                );
            });    
        });

        describe('when the game has at less than 15 custom questions', () => {
            beforeEach(() => {
                const customCategories = [...Array(8).keys()].map(i => i.toString());

                console.log(JSON.stringify(customCategories));
    
                const customQuestions: CustomCategoriesDynamoRecord = {
                    PartitionKey: gameId,
                    SortKey: createCustomCategoriesSortKey(),
                    GameId: gameId,
                    Categories: customCategories
                };
            
                getSpy.mockImplementation((indexQuery, sortKeyQuery?) => 
                    Promise.resolve([customQuestions])
                );
    
                randomSpy.mockImplementation(() => 0)
            });
    
            it('will create three rounds of custom questions', async () =>{
                await setupQuestionsForRounds(gameId);

                expect(putSpy).toHaveBeenCalledTimes(1);
                expect(putSpy).toHaveBeenCalledWith(
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(1),
                        Round: 1,
                        Letter: letterRound1,
                        Categories: ['1', '2', '3', '4', '5'].map((value, index) => {
                            return { 
                                Category: value,
                                QuestionNumber: index
                            }
                        })
                    },
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(2),
                        Round: 2,
                        Letter: letterRound2,
                        Categories: ['6', '7', '0', defaultCategories[0], defaultCategories[1]].map((value, index) => {
                            return { 
                                Category: value,
                                QuestionNumber: index
                            }
                        })
                    },
                    {
                        PartitionKey: gameId,
                        SortKey: createQuestionSortKey(3),
                        Round: 3,
                        Letter: letterRound3,
                        Categories: [
                            defaultCategories[2], 
                            defaultCategories[3], 
                            defaultCategories[4],
                            defaultCategories[5], 
                            defaultCategories[6]].map((value, index) => {
                                return { 
                                    Category: value,
                                    QuestionNumber: index
                                }
                        })
                    }
                );
            });    
        });

    });
});
