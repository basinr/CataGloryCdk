import * as dynamoDao from "../dao/dynamoDao";
import * as answerManager from "../manager/answerManager";
import { GameItemDynamoDB } from "../manager/gameManager";
import { GameScore, Score } from "./roundScorerManager";

export const calculate = async (gameId: string, round: number, users: GameItemDynamoDB[]): Promise<GameScore> => {
    const answers = await dynamoDao.getItemsByIndexAndSortKey({
        indexName: dynamoDao.GSI_KEY,
        indexValue: gameId
    }, {
        sortKeyName: dynamoDao.GSI_SORT_KEY,
        sortKeyPrefix: answerManager.AnswerPrefix + '|' + round
    }) as answerManager.AnswerDynamoItem[];
    
    const questions = await answerManager.getQuestions(gameId, round);

    console.log('Answers for the round ' + JSON.stringify(answers));
    console.log("Questions: " + JSON.stringify(questions));

    const answerCountPerQuestion= countAnswersPerQuestion(answers);

    const usersScores = createInitialScoreMap(users);

    answers.forEach((value: answerManager.AnswerDynamoItem) => {
        const numberOfAnswers = answerCountPerQuestion.get(value.QuestionNumber)!!.get(value.Answer.toLowerCase());
        console.log("NumberOfAnswers: " + numberOfAnswers + ", for: " + value.Answer);

        if (numberOfAnswers == 1 && value.Answer.toLowerCase().startsWith(questions.letter.toLowerCase())) {
            let currentScore = usersScores.get(value.UserId)!!;

            usersScores.set(value.UserId, {
                ...currentScore,
                score: currentScore.score + 1
            });
        }
    });

    return Promise.resolve({
        scores: [...usersScores.values()]
    });
};

const countAnswersPerQuestion = (answers: answerManager.AnswerDynamoItem[]) => {
    const answerCountPerQuestion = new Map<number, Map<string, number>>();

    answers.forEach(answer => {
        const answerSet = answerCountPerQuestion.get(answer.QuestionNumber) || new Map<string, number>();

        let numberOfAnswers = 0;

        const currentAnswerNum = answerSet.get(answer.Answer.toLowerCase());
        if (currentAnswerNum !== undefined) {
            numberOfAnswers = currentAnswerNum;
        }

        answerSet.set(answer.Answer.toLowerCase(), 1 + numberOfAnswers);

        answerCountPerQuestion.set(answer.QuestionNumber, answerSet);
    });

    return answerCountPerQuestion;
};

const createInitialScoreMap = (userGames: GameItemDynamoDB[]) => {
    const usersScores = new Map<string, Score>();
    
    userGames.forEach(userGames => {
        usersScores.set(userGames.UserId, {
            score: 0,
            userId: userGames.UserId,
            nickname: userGames.Nickname
        });
    });


    userGames[0].Scores.scores.forEach(score => {
        usersScores.set(score.userId, score);
    });

    return usersScores;
};
