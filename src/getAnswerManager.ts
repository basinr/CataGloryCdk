import * as dynamoDao from "./dynamoDao";
import { QuestionPrefx } from "./gameManager";

export interface GetAnswerRequest {
    userId: string,
    gameId: string,
    round: number
};

export interface GetAnswerResponse {
    letter: string,
    categories: string[],
    round: number
}
  
export function getQuestions(gameId: string, round: number): Promise<GetAnswerResponse> {
    return dynamoDao.getItemsByIndexAndSortKey(
        {
            indexName: dynamoDao.PRIMARY_KEY,
            indexValue: gameId
        }, {
            sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
            sortKeyPrefix: QuestionPrefx + '|' + round
    })
    .then(items => {
        if (items.length == 0) {
            throw new Error('400 no game found');
        }

        return items[0]
    })
    .then(item => {
        return {
            letter: item.Letter,
            categories: item.Categories,
            round: item.Round
        }
    });
};
