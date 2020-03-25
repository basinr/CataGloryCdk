import * as dynamoDao from './dynamoDao'
import { Guid } from 'guid-typescript';
import { IdMinter } from './idMinter';

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
  other_attributes: {}
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

export interface GetGamesByStateRequest {
  userId: string,
  gameState: string
}

export function createNewGame(request: CreateNewGameRequest) : Promise<CreateNewGameResponse> {
  console.log(JSON.stringify(request));

  if (request.userId == null) {
    throw new Error("You need to supply a userId!");
  }

  const gameId = IdMinter(); 

  return dynamoDao.putItemsTransaciton(
    {
      PartitionKey: request.userId,
      SortKey: "CREATED|" + gameId + "|" + request.userId,
    },
    {
      PartitionKey: gameId,
      SortKey: request.userId,
    }
  ).then(() => {
    console.log("got here!!!!!!!!!!");
  }).then(() => {
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
  if (request.userId == null || request.gameId == null) {
    throw new Error("400 You need to supply a userId and a gameId");
  }

  return dynamoDao.putItemsTransaciton(
    {
      PartitionKey: request.userId,
      SortKey: "CREATED|" + request.gameId + "|" + request.userId,
    },
    {
      PartitionKey: request.gameId,
      SortKey: request.userId,
    }
  ).then(() => { 
      return {
        userId: request.userId,
        gameId: request.gameId
      }
    });
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

export async function getGame(event: any= {}) : Promise <any> {
  let getGameRequest: GetGameRequest = {
      gameId: ''
  }

  try {
    const gameId = event.queryStringParameters.gameId;
    if (!gameId) {
      return { statusCode: 400, body: `Error: You are missing queryStringParameters` };
    }
    getGameRequest.gameId =  gameId;
  } catch (jsonParseError) {
    console.log('Malformed request to create new game, error parsing json: ' + jsonParseError);
    return { 
      statusCode: 400, 
      body: 'Malformed request to create new game, error parsing json: ' + jsonParseError
    };
  }

  return dynamoDao.getGame(getGameRequest);
}