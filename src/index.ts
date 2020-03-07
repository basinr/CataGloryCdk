import * as create from './create';

export const handler = async (event: any = {}) : Promise <any> => {
    console.log("Incoming event: " + JSON.stringify(event));

    if (!event.body) {
      return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
    }
  
    const httpMethod: String = event.requestContext.httpMethod;
  
    switch(httpMethod) {
      case "POST":
        return create.handler(event)
    }

    return { statusCode: 201, body: 'Hello world!' };
  };
  