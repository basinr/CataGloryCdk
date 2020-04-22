import * as dynamoDao from './dynamoDao'
import * as idMinter from './idMinter';
import * as randomLetterGenerator from './randomLetterGenerator';
import { response, request } from 'express';
import { defaultCategories } from './defaultCategories';

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
  score: number
}

export interface GetGameResponse {
  gameId: string,
  host: Player,
  players: PlayerGameData[]
}

export interface GetGamesByStateRequest {
  userId: string,
  gameState: string
}

export interface GameItemDynamoDB extends dynamoDao.DynamoItem {
  Nickname: string,
  Host: boolean,
  Score: number
  GameId: string,
  UserId: string, 
  Round: number,
  State: GameStates
}

export interface Question {
  QuestionNumber: number,
  Category: string
}

export interface QuestionDynamoDB extends dynamoDao.DynamoItem {
  Letter: string,
  Categories: Question[],
  Round: number
}

export interface GetGamesForUserResponse {
  games: BasicGameInfo[]
}

export interface BasicGameInfo {
  userId: string,
  gameId: string
}

export const QuestionPrefx = 'QUESTION';
export const GamePrefix = 'GAME';
export enum GameStates {
  Created = "CREATED",
  Pending = "PENDING",
  Waiting = "WAITING",
  Completed = "COMPLETED"
}

export interface GetGamesForUserRequest {
  userId: string,
  state?: string
}

export function createNewGame(request: CreateNewGameRequest) : Promise<CreateNewGameResponse> {
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
      Score: 0,
      CreatedDateTime: dateString,
      State: GameStates.Pending
    } as GameItemDynamoDB,
    {
      PartitionKey: gameId,
      SortKey: QuestionPrefx + '|' + 1,
      Letter: randomLetterGenerator.generate(),
      Categories: defaultCategories[1],
      Round: 1,
      CreatedDateTime: dateString
    } as QuestionDynamoDB
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
    Score: 0,
    CreatedDateTime: dateString,
    State: GameStates.Pending
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
  }, sortKeyQuery).then(items => {
      return {
        games: items.map(item => {
          return {
            userId: item.UserId,
            gameId: item.GameId
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
  }).then(items => {
      console.log("Response : " + JSON.stringify(response));
      return {
        host: {
          userId: items.filter(item => item.Host)[0].PartitionKey,
          nickname: items.filter(item => item.Host)[0].Nickname
        },
        gameId: request.gameId,
        players: items.map(item => {
          return {
            userId: item.UserId,
            score: item.Score,
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
