import * as dynamoDao from './dynamoDao'

export interface CreateNewGameRequest {
    userId: string,
    other_attributes: {}
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

export const createNewGame= async (event: any = {}) : Promise <any> => {
    let putItemRequest: CreateNewGameRequest = {
        userId: '',
        other_attributes: {}
    }
    
    try {
      const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
      putItemRequest.other_attributes = item;
      putItemRequest.userId =  item.userId;
    } catch (jsonParseError) {
      console.log('Malformed request to create new game, error parsing json: ' + jsonParseError);
      return { 
        statusCode: 400, 
        body: 'Malformed request to create new game, error parsing json: ' + jsonParseError
      };
    }

    return dynamoDao.transactNewgame(putItemRequest);
};

export const getGamesForUser= async(event: any= {}) : Promise <any> => {
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

export const getGame= async(event: any= {}) : Promise <any> => {
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