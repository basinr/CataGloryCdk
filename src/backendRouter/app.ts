 import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { 
    createNewGame, 
    joinGame, 
    getGame, 
    getGamesForUser, 
    endRound
} from '../manager/gameManager';
import compression from 'compression';
import { getQuestions, putAnswer, getAnswers } from '../manager/answerManager';

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

router.post('/ROUND/:userId/:gameId', async(req, res) => {
    await endRound({
        userId: req.params.userId,
        gameId: req.params.gameId
    });

    res.json({});
});

app.use('/', router);

export default app;