import * as manager from './gameManager';

export const handler = async (event: any = {}) : Promise <any> => {
    console.log("Incoming event: " + JSON.stringify(event));
  
    const httpMethod: String = event.requestContext.httpMethod;
  
    switch(httpMethod) {
      case "POST":
        return manager.createNewGame(event)
      case "GET":
        return manager.getGamesForUser(event)
    }

    return { statusCode: 201, body: 'HTTP Request not found or handled yet.' };
  };
  