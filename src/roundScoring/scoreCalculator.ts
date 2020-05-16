import * as dynamoDao from "../dao/dynamoDao";
import * as answerManager from "../manager/answerManager";
import { GameItemDynamoDB } from "../manager/gameManager";
import { GameScore, Score } from "./roundScorerManager";

const STRIKE_THRESHOLD = 1;

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

    const usersScores = createInitialScoreMap(users, round);

    answers.forEach((value: answerManager.AnswerDynamoItem) => {
        const numberOfAnswers = answerCountPerQuestion.get(value.QuestionNumber)!!.get(value.Answer.toLowerCase());
        console.log("NumberOfAnswers: " + numberOfAnswers + ", for: " + value.Answer);

        if (numberOfAnswers == 1 && validAnwser(value, questions)) {
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

const createInitialScoreMap = (userGames: GameItemDynamoDB[], round: number) => {
    const usersScores = new Map<string, Score>();
    
    userGames.forEach(userGames => {
        usersScores.set(userGames.UserId, {
            score: 0,
            userId: userGames.UserId,
            nickname: userGames.Nickname
        });
    });

    let initialScores = userGames[0].Scores;

    if (userGames[0].Round !== round) {
        initialScores = userGames[0].LastRoundScores;
    }

    console.log('InitialScores : ' + JSON.stringify(initialScores));

    initialScores.scores.forEach(score => {
        usersScores.set(score.userId, score);
    });

    usersScores.forEach((value, key) => {
        console.log('Value = ' + JSON.stringify(value));
        console.log('Key = ' + key);
    });

    return usersScores;
};

const validAnwser = (answer: answerManager.AnswerDynamoItem, questions: answerManager.GetQuestionsResponse): boolean => {
    const uniqueStrikes = answer.Strikes.filter((value, index, array) => array.indexOf(value) === index);

    return answer.Answer.toLowerCase().startsWith(questions.letter.toLowerCase()) && uniqueStrikes.length < STRIKE_THRESHOLD;
};
