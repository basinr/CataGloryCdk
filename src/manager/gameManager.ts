import * as dynamoDao from '../dao/dynamoDao'
import * as idMinter from './idMinter';
import { createQuestionRecord } from './answerManager';
import { GameScore } from '../roundScoring/roundScorerManager';

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
  nickname: string
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
  State: GameStates
  Scores: GameScore,
};

export interface GetGamesForUserResponse {
  games: BasicGameInfo[]
};

export interface BasicGameInfo {
  userId: string,
  gameId: string,
  state: GameStates,
  round: number,
  scores: GameScore
};

export const GamePrefix = 'GAME';
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

export async function createNewGame(request: CreateNewGameRequest) : Promise<CreateNewGameResponse> {
  console.log(JSON.stringify(request));

  const gameId = idMinter.mint(); 
  const dateString = new Date(Date.now()).toISOString();

  return dynamoDao.transactPut(
    {
      PartitionKey: request.userId,
      SortKey: GamePrefix + '|' + GameStates.Pending + '|' + gameId,
      Gsi: gameId,
      GsiSortKey: GamePrefix + '|' + request.userId,
      Nickname: request.nickname,
      Round: 1,
      UserId: request.userId,
      GameId: gameId,
      Host: true,
      CreatedDateTime: dateString,
      State: GameStates.Pending,
      Scores: {
        scores: []
      }
    } as GameItemDynamoDB,
    createQuestionRecord(gameId, 1, dateString)
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
    PartitionKey: request.userId,
    SortKey: GamePrefix + '|' + GameStates.Pending + '|' + request.gameId,
    Gsi: request.gameId,
    GsiSortKey: GamePrefix + '|' + request.userId,
    Nickname: request.nickname,
    Round: 1,
    UserId: request.userId,
    GameId: request.gameId,
    Host: false,
    CreatedDateTime: dateString,
    State: GameStates.Pending,
    Scores: {
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

export async function getGamesForUser(userId: string, state = "") : Promise <GetGamesForUserResponse> {
  const sortKeyQuery: dynamoDao.SortKeyQuery = {
    sortKeyName: dynamoDao.PRIMARY_SORT_KEY, 
    sortKeyPrefix: GamePrefix + '|' + state
  };
  
  return dynamoDao.getItemsByIndexAndSortKey({
    indexName: dynamoDao.PRIMARY_KEY, 
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
            state: item.State
          }
        })
      }}
    );
};

export async function getGame(request: GetGameRequest) : Promise <GetGameResponse> {
  return dynamoDao.getItemsByIndexAndSortKey({
    indexName: dynamoDao.GSI_KEY, 
    indexValue: request.gameId
  },{
    sortKeyName: dynamoDao.GSI_SORT_KEY,
    sortKeyPrefix: GamePrefix
  })
  .then(items => items as GameItemDynamoDB[])
  .then(items => {
      return {
        host: {
          userId: items.filter(item => item.Host)[0].PartitionKey,
          nickname: items.filter(item => item.Host)[0].Nickname
        },
        gameId: request.gameId,
        round: items[0].Round,
        players: items.map(item => {
          return {
            userId: item.UserId,
            nickname: item.Nickname
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
  const oldSortKeyPrefix = GamePrefix + '|' + GameStates.Pending + '|' + request.gameId;

  const currentRound = await dynamoDao.getItemsByIndexAndSortKey(
    {
      indexName: dynamoDao.PRIMARY_KEY,
      indexValue: request.userId
    }, {
      sortKeyName: dynamoDao.PRIMARY_SORT_KEY,
      sortKeyPrefix: oldSortKeyPrefix
    }
  );

  if (currentRound.length == 0) return Promise.reject(new Error('Cannot update the round'));

  const gameRow = currentRound[0] as GameItemDynamoDB;
  gameRow.SortKey = GamePrefix + '|'  + GameStates.Waiting + '|' + request.gameId;
  gameRow.State = GameStates.Waiting;
  return dynamoDao.updateItemWithKeyChange(
    {
      PartitionKey: request.userId,
      SortKey: oldSortKeyPrefix 
    }, 
    gameRow
  );
}

export async function startNewRound(...gameItems: GameItemDynamoDB[]) {
  const dateString = new Date(Date.now()).toISOString();

  const gameId = gameItems[0].GameId;
  const round = gameItems[0].Round + 1;
    
  await dynamoDao.put(createQuestionRecord(gameId, round, dateString));
  
  const newRoundItems = gameItems.map(item => {
      return {
          ...item,
          SortKey: GamePrefix + '|' + GameStates.Pending + '|' + gameId,
          Round: round,
          State: GameStates.Pending,
          CreatedDateTime: dateString
      }
  }) as GameItemDynamoDB[];

  console.log("All users in game: " + JSON.stringify(gameItems));

  return dynamoDao.updateItemsWithKeyChange(gameItems, newRoundItems).then();
}
