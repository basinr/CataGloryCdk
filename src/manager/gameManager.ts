import * as dynamoDao from '../dao/dynamoDao'
import * as idMinter from './idMinter';
import * as gameManager from './gameManager';
import * as questionManager from './questionManager';
import { GameScore } from '../roundScoring/roundScorerManager';
import { createCustomCategoryRecord } from './questionManager';

export interface CreateNewGameRequest {
    userId: string,
    nickname: string
}

export interface CreateNewGameResponse {
  userId: string,
  gameId: string
}

export interface JoinGameRequest {
  userId: string,
  gameId: string,
  nickname: string
}

export interface JoinGameResponse {
  userId: string,
  gameId: string
}

export interface GetGameRequest {
  gameId: string
}

export interface Player {
  userId: string,
  nickname: string
}

export interface PlayerGameData {
  userId: string,
  nickname: string,
  state: GameStates
}

export interface GetGameResponse {
  gameId: string,
  host: Player,
  round: number,
  players: PlayerGameData[]
}

export interface GetGamesByStateRequest {
  userId: string,
  gameState: string
}

export interface GameItemDynamoDB extends dynamoDao.DynamoItem {
  Nickname: string,
  Host: boolean,
  GameId: string,
  UserId: string, 
  Round: number,
  GameState: GameStates
  Scores: GameScore,
  LastRoundScores: GameScore
};

export interface GetGamesForUserResponse {
  games: BasicGameInfo[]
};

export interface BasicGameInfo {
  userId: string,
  gameId: string,
  state: GameStates,
  round: number,
  scores: GameScore,
  isHost: boolean
};

const GamePrefix = 'GAME';
export const AnswerPrefix = 'ANSWER';
export enum GameStates {
  Created = "CREATED",
  Pending = "PENDING",
  Waiting = "WAITING",
  Completed = "COMPLETED"
};

export interface GetGamesForUserRequest {
  userId: string,
  state?: string
}

export function createGameItemSortKey(userId: string = ""): string {
  return GamePrefix + '#' + userId;
}

export function createGameItemGSISortKey(state: GameStates, gameId: string = ""): string {
  return GamePrefix + '#' + state + '#' + gameId;
}

export function createPartialGameItemGSISortKey(state: string = ""): string {
  return GamePrefix + '#' + state;
}

const initialGameScore: GameScore = { scores: [] };

export async function createNewGame(request: CreateNewGameRequest) : Promise<CreateNewGameResponse> {
  console.log(JSON.stringify(request));

  const gameId = idMinter.mint(); 
  const dateString = new Date(Date.now()).toISOString();

  return dynamoDao.transactPut(
    {
      PartitionKey: gameId,
      SortKey: createGameItemSortKey(request.userId),
      Gsi: request.userId,
      GsiSortKey: createGameItemGSISortKey(GameStates.Created, gameId),
      Nickname: request.nickname,
      Round: 1,
      UserId: request.userId,
      GameId: gameId,
      Host: true,
      CreatedDateTime: dateString,
      GameState: GameStates.Created,
      Scores: {
        scores: []
      },
      LastRoundScores: {
        scores: []
      }
    } as GameItemDynamoDB,
    createCustomCategoryRecord(gameId)
  ).then(() => {
    return {
      userId: request.userId,
      gameId: gameId
    }
  });
};

export async function joinGame(request: JoinGameRequest): Promise <JoinGameResponse> {
  console.log(JSON.stringify(request));

  const dateString = new Date(Date.now()).toISOString();

  const item: GameItemDynamoDB = {
    PartitionKey: request.gameId,
    SortKey: createGameItemSortKey(request.userId),
    Gsi: request.userId,
    GsiSortKey: createGameItemGSISortKey(GameStates.Created, request.gameId),
    Nickname: request.nickname,
    Round: 1,
    UserId: request.userId,
    GameId: request.gameId,
    Host: false,
    CreatedDateTime: dateString,
    GameState: GameStates.Created,
    Scores: {
      scores: []
    },
    LastRoundScores: {
      scores: []
    }
  };

  return dynamoDao.put(item).then(() => {
    return {
      userId: request.userId,
      gameId: request.gameId
    }
  });
};

export async function startGame(gameId: string, userId: string): Promise<void> {
  console.log("The user : " + userId);
  
  const getGameResponse = await gameManager.getGame({gameId: gameId});

  console.log("The hostId : " + getGameResponse.host.userId);

  if (getGameResponse.host.userId !== userId) {
    return Promise.reject(new Error("user is not the host and is not allowed to start the game"))
  }

  if(getGameResponse.players[0].state !== GameStates.Created) {
    return Promise.reject(new Error("Game is not in created state"))
  }

  await questionManager.setupQuestionsForRounds(gameId);

  return gameManager.startNewRound(gameId, 
    0, 
    initialGameScore, 
    {
      scores: getGameResponse.players.map(player => {
        return {
          nickname: player.nickname,
          userId: player.userId,
          score: 0
        }
      })
    }, 
    ...getGameResponse.players.map(player => player.userId));
};

export async function getGamesForUser(userId: string, state = "") : Promise <GetGamesForUserResponse> {
  const sortKeyQuery: dynamoDao.SortKeyQuery = {
    sortKeyName: dynamoDao.GSI_SORT_KEY, 
    sortKeyPrefix: createPartialGameItemGSISortKey(state)
  };
  
  return dynamoDao.getItemsByIndexAndSortKey({
    indexName: dynamoDao.GSI_KEY, 
    indexValue: userId
  }, sortKeyQuery)
  .then(items => items as GameItemDynamoDB[])
  .then(items => {
      return {
        games: items.map(item => {
          return {
            userId: item.UserId,
            gameId: item.GameId,
            round: item.Round,
            scores: item.Scores,
            state: item.GameState,
            isHost: item.Host
          }
        })
      }}
    );
};

export async function getGame(request: GetGameRequest) : Promise <GetGameResponse> {
  return dynamoDao.getItemsByIndexAndSortKey({
    indexName: dynamoDao.PRIMARY_KEY, 
    indexValue: request.gameId
  },{
    sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
    sortKeyPrefix: createGameItemSortKey()
  })
  .then(items => items as GameItemDynamoDB[])
  .then(items => {
      return {
        host: {
          userId: items.filter(item => item.Host)[0].UserId,
          nickname: items.filter(item => item.Host)[0].Nickname
        },
        gameId: request.gameId,
        round: items[0].Round,
        players: items.map(item => {
          return {
            userId: item.UserId,
            nickname: item.Nickname,
            state: item.GameState
          }
        })
      }
  });
};

export interface EndRoundRequest {
  userId: string,
  gameId: string
};

export async function endRound(request: EndRoundRequest): Promise<void> {
  const oldSortKeyPrefix = createGameItemGSISortKey(GameStates.Pending, request.gameId);

  const currentRound = await dynamoDao.getItemsByIndexAndSortKey(
    {
      indexName: dynamoDao.GSI_KEY,
      indexValue: request.userId
    }, {
      sortKeyName: dynamoDao.GSI_SORT_KEY,
      sortKeyPrefix: oldSortKeyPrefix
    }
  );

  if (currentRound.length == 0) return Promise.reject(new Error('Cannot update the round'));

  const gameRow = currentRound[0] as GameItemDynamoDB;
  gameRow.GsiSortKey = createGameItemGSISortKey(GameStates.Waiting, request.gameId);
  gameRow.GameState = GameStates.Waiting;
  return dynamoDao.bulkUpdateForParitionKey(
    gameRow.PartitionKey,
    [gameRow.SortKey],
    [
      {
        name: dynamoDao.GSI_SORT_KEY,
        value: createGameItemGSISortKey(GameStates.Waiting, request.gameId)
      },
      {
        name: 'GameState',
        value: GameStates.Waiting
      }
    ]
  );
}

export async function startNewRound(gameId: string, currentRound: number, oldScore: GameScore, newScore: GameScore, ...userIds: string[]) {
  const dateString = new Date(Date.now()).toISOString();

  const newRound = currentRound + 1;

  const sortKeys = userIds.map(userId => createGameItemSortKey(userId));
  const attributesToUpdate: dynamoDao.AttributeNameValue[] = [
    {
      name: dynamoDao.GSI_SORT_KEY, 
      value: createGameItemGSISortKey(GameStates.Pending, gameId)
    },
    {
      name: 'Round',
      value: newRound
    }, 
    {
      name: 'GameState',
      value: GameStates.Pending
    }, 
    {
      name: 'CreatedDateTime',
      value: dateString
    },
    {
      name: 'Scores',
      value: newScore
    },
    {
      name: 'LastRoundScores',
      value: oldScore
    }
  ];
  
  return dynamoDao.bulkUpdateForParitionKey(gameId, sortKeys, attributesToUpdate).then();
}

export async function updateScores(score: GameScore, gameId: string, ...userIds: string[]) {
  const dateString = new Date(Date.now()).toISOString();

  const sortKeys = userIds.map(userId => createGameItemSortKey(userId));
  const attributesToUpdate: dynamoDao.AttributeNameValue[] = [
    {
      name: 'Scores',
      value: score
    }
  ];
  
  return dynamoDao.bulkUpdateForParitionKey(gameId, sortKeys, attributesToUpdate).then();
}
