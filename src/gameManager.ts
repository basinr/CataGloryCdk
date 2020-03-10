import * as dynamoDao from './dynamoDao'

export interface CreateNewGameRequest {
    userId: string,
    gameId: string,
    roundNum: number,
    other_attributes: {}
}

export interface GetGamesRequest {
    userId: string
}

export const createNewGame= async (event: any = {}) : Promise <any> => {
    let putItemRequest: CreateNewGameRequest = {
        userId: '',
        gameId: '',
        roundNum: -1,
        other_attributes: {}
    }
    
    try {
      const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
      putItemRequest.other_attributes = item;
      putItemRequest.userId =  item.userId;
      putItemRequest.gameId = item.gameId; 
      putItemRequest.roundNum = item.roundNum;
    } catch (jsonParseError) {
      console.log('Malformed request to create new game, error parsing json: ' + jsonParseError);
      return { 
        statusCode: 400, 
        body: 'Malformed request to create new game, error parsing json: ' + jsonParseError
      };
    }

    return dynamoDao.putNewGame(putItemRequest);
};

export const getGamesForUser= async(event: any= {}) : Promise <any> => {
    let getGamesRequest: GetGamesRequest = {
        userId: ''
    }

    try {
      const userId = event.queryStringParameters.userId;
      if (!userId) {
        return { statusCode: 400, body: `Error: You are missing the path parameter id` };
      }
      getGamesRequest.userId =  userId;
    } catch (jsonParseError) {
      console.log('Malformed request to create new game, error parsing json: ' + jsonParseError);
      return { 
        statusCode: 400, 
        body: 'Malformed request to create new game, error parsing json: ' + jsonParseError
      };
    }

    return dynamoDao.getGames(getGamesRequest);
}