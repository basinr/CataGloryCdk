 import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { 
    createNewGame, 
    joinGame, 
    getGame, 
    getGamesForUser 
} from './gameManager';
import compression from 'compression';
import { getQuestions } from './getAnswerManager';

const app = express();
const router = express.Router();

router.use(compression());
router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(awsServerlessExpressMiddleware.eventContext());

router.get('/GAMES/:userId', async (req,  res) => {
    const response = await getGamesForUser(req.params.userId)
    res.send(JSON.stringify(response));
});

router.get('/GAMES/:userId/:state', async (req,  res) => {
    console.log("userId : " + req.params.userId);
    console.log("state : " + req.params.state);
    const response = await getGamesForUser(req.params.userId, req.params.state);
    res.send(JSON.stringify(response));
});

router.get('/GAME/:gameId', async (req,  res) => {
    const getGameResponse = await getGame({
        gameId: req.params.gameId
    });
    res.send(JSON.stringify(getGameResponse));
});

router.post('/GAME', async (req, res) => {
    const createNewGameResponse = await createNewGame(req.body);
    res.send(JSON.stringify(createNewGameResponse));
});

router.put('/GAME', async (req, res) => {
    res.send(JSON.stringify(await joinGame(req.body)));
});

router.get('/QUESTIONS/:gameId/:round', async (req, res) => {
    const response = await getQuestions(req.params.gameId, req.params.round as unknown as number);

    res.send(JSON.stringify(response));
});

app.use('/', router);

export default app;