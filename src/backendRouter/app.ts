 import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { 
    createNewGame, 
    joinGame, 
    getGame, 
    getGamesForUser, 
    endRound,
    startGame
} from '../manager/gameManager';
import compression from 'compression';
import { getQuestions, putAnswer, getAnswers, reportAnswer } from '../manager/answerManager';
import { putCustomCategory } from '../manager/questionManager';

const app = express();
const router = express.Router();

router.use(compression());
router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(awsServerlessExpressMiddleware.eventContext());

router.get('/GAMES/:userId', async (req,  res) => {
    const response = await getGamesForUser(req.params.userId)
    res.json(response);
});

router.get('/GAMES/:userId/:state', async (req,  res) => {
    console.log("userId : " + req.params.userId);
    console.log("state : " + req.params.state);
    const response = await getGamesForUser(req.params.userId, req.params.state);
    res.json(response);
});

router.get('/GAME/:gameId', async (req,  res) => {
    const getGameResponse = await getGame({
        gameId: req.params.gameId
    });
    res.json(getGameResponse);
});

router.post('/GAME', async (req, res) => {
    const createNewGameResponse = await createNewGame(req.body);
    res.json(createNewGameResponse);
});

router.put('/GAME', async (req, res) => {
    res.json(await joinGame(req.body));
});

router.get('/QUESTIONS/:gameId/:round', async (req, res) => {
    const response = await getQuestions(req.params.gameId, req.params.round as unknown as number);

    res.json(response);
});

router.put('/ANSWER', async(req, res) => {
    await putAnswer(req.body);

    res.json({});
});

router.get('/ANSWERS/:gameId/:round', async (req, res) => {
    const response = await getAnswers({gameId: req.params.gameId, round: req.params.round as unknown as number});

    res.json(response);
});

router.put('/ANSWERSTRIKE/:userId/:violater/:gameId/:round/:questionNumber', async (req, res) => {
    await reportAnswer(req.params.userId, 
        req.params.violater, 
        req.params.gameId, 
        req.params.round as unknown as number, 
        req.params.questionNumber as unknown as number);

    res.json({});
});

router.post('/ROUND/:userId/:gameId', async(req, res) => {
    await endRound({
        userId: req.params.userId,
        gameId: req.params.gameId
    });

    res.json({});
});

router.put('/QUESTION/:gameId', async(req, res) => {
    await putCustomCategory(req.params.gameId, req.body.category);

    res.json({});
});

router.put('/START/:userId/:gameId', async (req, res) => {
    await startGame(req.params.gameId, req.params.userId);

    res.json({});
});

app.use('/', router);

export default app;