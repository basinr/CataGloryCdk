 import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { createNewGame, joinGame, getGame, getGamesForUser } from './gameManager';
import compression from 'compression';

const app = express();
const router = express.Router();

// router.use(compression());
router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(awsServerlessExpressMiddleware.eventContext());

router.get('/GAMES', async (req,  res) => {
    res.json(await getGamesForUser(req));
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

app.use('/', router);

export default app;