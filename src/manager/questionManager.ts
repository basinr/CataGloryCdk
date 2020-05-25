import * as dynamoDao from '../dao/dynamoDao'
import * as randomLetterGenerator from './randomLetterGenerator';
import { QuestionDynamoDB, createQuestionSortKey } from './answerManager';
import { defaultCategories } from './defaultCategories';

export interface CustomCategoriesDynamoRecord extends dynamoDao.DynamoItem{
    GameId: string,
    Categories: string[]
}

export function createCustomCategoriesSortKey() {
    return 'CUSOM_CATEGORY';
}

export function createCustomCategoryRecord(gameId: string): CustomCategoriesDynamoRecord {
    return {
        PartitionKey: gameId,
        SortKey: createCustomCategoriesSortKey(),
        GameId: gameId,
        Categories: []
    }
}

export async function putCustomCategory(gameId: string, category: string): Promise<void> {
    return dynamoDao.appendToValue(
        gameId,
        createCustomCategoriesSortKey(),
        'Categories',
        [category]
    ).then();
}

export async function setupQuestionsForRounds(gameId: string) {
    const customQuestions: CustomCategoriesDynamoRecord[] = await dynamoDao.getItemsByIndexAndSortKey(
        {
            indexName: dynamoDao.PRIMARY_KEY,
            indexValue: gameId
        },
        {
            sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
            sortKeyPrefix: createCustomCategoriesSortKey()
        }
    ) as CustomCategoriesDynamoRecord[];

    console.log(JSON.stringify(customQuestions));

    const customCategories = prepareQuestions(customQuestions[0].Categories);

    console.log(JSON.stringify(customCategories));

    const questions: QuestionDynamoDB[] = rounds().map(round => {
        return {
            PartitionKey: gameId,
            SortKey: createQuestionSortKey(round + 1),
            Round: round + 1,
            Letter: randomLetterGenerator.generate(),
            Categories: questionNumbers().map(questionNumber => {
                return {
                    Category: customCategories[round * 5 + questionNumber],
                    QuestionNumber: questionNumber
                }
            })
        }
    });

    console.log(JSON.stringify(questions));
    
    return dynamoDao.transactPut(
        ...questions
    ).then();
};

function prepareQuestions(customQuestions: string[]): string[] {
    return (shuffle(customQuestions)).concat(shuffle(defaultCategories));
}

function rounds(): number[] {
    return [...Array(3).keys()];
}

function questionNumbers(): number[] {
    return [...Array(5).keys()];
}

function shuffle(array: string[]):string[] {
    let currentIndex = array.length;
	let temporaryValue, randomIndex;

	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}
