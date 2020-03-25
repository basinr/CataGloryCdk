import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import { createNewGame, joinGame, getGame, getGamesForUser } from './gameManager';
import compression from 'compression';

const app = express();
const router = express.Router();

router.use(compression());
router.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(awsServerlessExpressMiddleware.eventContext());

router.get('/GAMES', async (req,  res) => {
    res.json(await getGamesForUser(req));
});

router.get('/GAME', async (req,  res) => {
    res.json(await getGame(req));
});


router.post('/GAME', async (req, res) => {
    res.json(await createNewGame(req.body));
});

router.put('/GAME', async (req, res) => {
    res.json(await joinGame(req.body));
});

app.use('/', router);

export default app;