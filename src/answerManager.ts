import * as dynamoDao from "./dynamoDao";
import { QuestionPrefx, GameStates } from "./gameManager";

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
  
export async function getQuestions(gameId: string, round: number): Promise<GetAnswerResponse> {
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

export interface PutAnswerRequest {
    gameId: string,
    userId: string,
    round: number, 
    questionNumber: number,
    answer: string
};

export interface AnswerDynamoItem extends dynamoDao.DynamoItem {
    UserId: string,
    GameId: string,
    Round: number,
    QuestionNumber: number,
    Answer: string
}

export const AnswerPrefix = 'ANSWER';

export async function putAnswer(request: PutAnswerRequest): Promise<void> {
    const gameItem = await dynamoDao.getItemsByIndexAndSortKey(
    {
        indexName: dynamoDao.PRIMARY_KEY,
        indexValue: request.userId
    },
    {
        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
        sortKeyPrefix: GameStates.Pending + '|' + request.gameId + '|' + request.round,
    });

    if (gameItem.length == 0) {
        throw new Error('This user is not allowed to submit an answer for this question');
    }

    const dateString = new Date(Date.now()).toISOString();

    return dynamoDao.put({
        PartitionKey: request.userId,
        SortKey: AnswerPrefix + '|' + request.gameId + '|' + request.round + '|' + request.questionNumber,
        Gsi: request.gameId,
        GsiSortKey: AnswerPrefix + '|' + request.round + '|' + request.userId + '|' + request.questionNumber,
        CreatedDateTime: dateString,
        UserId: request.userId,
        GameId: request.gameId,
        Round: request.round,
        QuestionNumber: request.questionNumber,
        Answer: request.answer
    } as AnswerDynamoItem).then();
}
