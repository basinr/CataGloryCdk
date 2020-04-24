import * as dynamoDao from "./dynamoDao";
import { QuestionPrefx, GameStates, GameItemDynamoDB, GamePrefix } from "./gameManager";

export interface GetQuestionsResponse {
    letter: string,
    categories: string[],
    round: number
}

export async function getQuestions(gameId: string, round: number): Promise<GetQuestionsResponse> {
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
    const gameItems = await dynamoDao.getItemsByIndexAndSortKey(
    {
        indexName: dynamoDao.PRIMARY_KEY,
        indexValue: request.userId
    },
    {
        sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
        sortKeyPrefix: GamePrefix + '|' + GameStates.Pending + '|' + request.gameId,
    }) as GameItemDynamoDB[];

    console.log(JSON.stringify(gameItems));

    if (gameItems.length == 0 || gameItems[0].Round != request.round) {
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

export interface GetAnswersRequest {
    gameId: string,
    round: number
};

export interface GetAnswersResponse {
    answers: any
}

export interface UserAnswer {
    questionNumber: number,
    userId: string,
    answer: string
}

export async function getAnswers(request: GetAnswersRequest): Promise<GetAnswersResponse> {
    const answerResponse: GetAnswersResponse = {
        answers: []
    };

    return dynamoDao.getItemsByIndexAndSortKey(
        {
            indexName: dynamoDao.GSI_KEY,
            indexValue: request.gameId
        },
        {
            sortKeyName: dynamoDao.GSI_SORT_KEY,
            sortKeyPrefix: AnswerPrefix + '|' + request.round,
        })
        .then(items => {
            if (items.length == 0) {
                throw new Error('400 no answers found');
            }
    
            return items
        })
        .then(items => {
            items.forEach(row => {
                answerResponse.answers.push({
                    questionNumber: row.QuestionNumber,
                    answer: row.Answer,
                    userId: row.UserId
                });
            });
            return answerResponse;
        });
}
