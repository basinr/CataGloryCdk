import * as dynamoDao from './dynamoDao'
import * as idMinter from './idMinter';
import { response } from 'express';

export interface CreateNewGameRequest {
    userId: string,
    other_attributes?: {}
}

export interface CreateNewGameResponse {
  userId: string,
  gameId: string
}

export interface JoinGameRequest {
  userId: string,
  gameId: string,
  other_attributes?: {}
}

export interface JoinGameResponse {
  userId: string,
  gameId: string
}

export interface GetGamesForUserRequest {
    userId: string
}

export interface GetGameRequest {
  gameId: string
}

export interface Player {
  userId: string,
  score: number
}

export interface GetGameResponse {
  gameId: string,
  hostUserId: string,
  players: Player[]
}

export interface GetGamesByStateRequest {
  userId: string,
  gameState: string
}

export interface GameItemDynamoDB extends dynamoDao.DynamoItem {
  Host: boolean,
  Score: number
}

export function createNewGame(request: CreateNewGameRequest) : Promise<CreateNewGameResponse> {
  console.log(JSON.stringify(request));

  const gameId = idMinter.mint(); 
  const dateString = new Date(Date.now()).toISOString();

  return dynamoDao.put(
    {
      PartitionKey: request.userId,
      SortKey: "CREATED|" + gameId,
      Gsi: gameId,
      GsiSortKey: request.userId,
      Host: true,
      Score: 0,
      CreatedDateTime: dateString
    } as GameItemDynamoDB,
  ).then(() => {
    return {
      userId: request.userId,
      gameId: gameId
    }
  }).catch(err => {
    console.log("found err : " + err);
    throw err;
  })
};

export async function joinGame(request: JoinGameRequest): Promise <JoinGameResponse> {
  const dateString = new Date(Date.now()).toISOString();

  const item: GameItemDynamoDB = {
    PartitionKey: request.userId,
    SortKey: "CREATED|" + request.gameId,
    Gsi: request.gameId,
    GsiSortKey: request.userId,
    Host: false,
    Score: 0,
    CreatedDateTime: dateString
  };

  console.log(JSON.stringify(item));

  return dynamoDao.put(item).then(() => {
    return {
      userId: request.userId,
      gameId: request.gameId
    }
  }).catch(err => {
    console.log("found err : " + err);
    throw err;
  })
}

export async function getGamesForUser(event: any= {}) : Promise <any> {
    let getGamesRequest: GetGamesForUserRequest = {
        userId: ''
    }

    try {
      const userId = event.queryStringParameters.userId;
      if (!userId) {
        return { statusCode: 400, body: `Error: You are missing queryStringParameters` };
      }
      getGamesRequest.userId =  userId;
    } catch (jsonParseError) {
      console.log('Malformed request to create new game, error parsing json: ' + jsonParseError);
      return { 
        statusCode: 400, 
        body: 'Malformed request to create new game, error parsing json: ' + jsonParseError
      };
    }

    return dynamoDao.getGamesForUser(getGamesRequest);
}

export async function getGame(request: GetGameRequest) : Promise <GetGameResponse> {
  return dynamoDao.getItemsByKey(dynamoDao.GSI_KEY, request.gameId)
    .then(items => {
      console.log("Response : " + JSON.stringify(response));
      return {
        hostUserId: items.filter((item: any) => item.Host)[0].PartitionKey,
        gameId: request.gameId,
        players: items.map((item: any) => {
          return {
            userId: item.PartitionKey,
            score: item.Score
          }
        })
      }
  });
}