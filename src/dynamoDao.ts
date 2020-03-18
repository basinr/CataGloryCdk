import { CreateNewGameRequest, GetGamesForUserRequest, GetGameRequest } from "./gameManager";
import { not } from "@aws-cdk/assert";
// import { Guid } from "guid-typescript"; todo: this does not work when deployed to lambda?

const AWS = require('aws-sdk');

const TABLE_NAME = 'TheOneToRuleThemAll';
const PRIMARY_KEY = 'PartitionKey';
const SORT_KEY = 'SortKey';
const GAME_STATE_KEY: string = 'GAME_STATE';
const CREATED_TIME_KEY = 'CreatedTime';


const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

const headersConfig = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
  'Access-Control-Allow-Origin': '*',
  'X-Requested-With': '*'
}

// todo: Make use of this for individual row updates or inserts?
export const updateGame= async (request: CreateNewGameRequest) : Promise <any> => {
  let dateToday = new Date();
  // Need to declare this within the method in order for mocking to work correctly
  let db = new AWS.DynamoDB.DocumentClient();
  let gameId = dateToday.toISOString() + "-game";

  console.log('Received request: ' + JSON.stringify(request));
  let item: any = request.other_attributes;
  item[PRIMARY_KEY] = request.userId;
  // fix to use real round number
  item[SORT_KEY] = 'CREATED' + '|' + gameId + '|' + 0;

  item[CREATED_TIME_KEY] = dateToday.toISOString();

  try {
    const put_params = {
      TableName: TABLE_NAME,
      Item: item
    };

    console.log('Creating new game with parameters: ' + JSON.stringify(put_params));
    const putItem: Promise<any> = await db.put(put_params).promise();
    console.log(JSON.stringify(putItem));
    return { 
      statusCode: 200, 
      body: JSON.stringify(put_params), 
      headers: headersConfig
    };
  } catch (dbError) {
    // const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    // DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    console.log('There was an erorr in the PUT request: ' + dbError.message)
    console.log(JSON.stringify(dbError));
    return { 
      statusCode: 500, body: dbError.message 
    };
  }
};

export const getGame = async (getGameRequest: GetGameRequest): Promise<any> => {
  let db = new AWS.DynamoDB.DocumentClient();
  const gameId = getGameRequest.gameId;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#pk = :pkey',
    ExpressionAttributeNames:{
      '#pk': PRIMARY_KEY
    },
    ExpressionAttributeValues: {
      ':pkey': gameId
    }
  };

  try {
    let result = null;
    console.log('GetGame request params: ' + JSON.stringify(params));
    const getGameResponse: Promise<any> = await db.query(params).promise();
    console.log(JSON.stringify(getGameResponse));
    return { 
      statusCode: 200, 
      body: JSON.stringify(getGameResponse) , 
      headers: headersConfig
    };
  } catch (dbError) {
    // const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    // DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    console.log(dbError.message);
    console.log(JSON.stringify(dbError));
    return { 
      statusCode: 500, body: dbError.message 
    };
  }
};

export const getGamesForUser = async (getGamesRequest: GetGamesForUserRequest) : Promise <any> => {
  // Need to declare this within the method in order for mocking to work correctly
  let db = new AWS.DynamoDB.DocumentClient();
  const userId = getGamesRequest.userId;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#pk = :pkey and begins_with(#sk, :skeybeginswith)',
    ExpressionAttributeNames:{
      '#pk': PRIMARY_KEY,
      '#sk': SORT_KEY
    },
    ExpressionAttributeValues: {
      ':pkey': userId,
      ':skeybeginswith': 'CREATED'
    }
  };

  try {
    let result = null;
    console.log('GET request params: ' + JSON.stringify(params));
    const getItem: Promise<any> = await db.query(params).promise();
    console.log(JSON.stringify(getItem))
    return { 
      statusCode: 200, 
      body: JSON.stringify(getItem) , 
      headers: headersConfig
    };
  } catch (dbError) {
    // const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    // DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    console.log(dbError.message);
    console.log(JSON.stringify(dbError));
    return { 
      statusCode: 500, body: dbError.message 
    };
  }
};

export const getGamesByState = async (getGamesRequest: GetGamesForUserRequest) : Promise <any> => {
  // Need to declare this within the method in order for mocking to work correctly
  let db = new AWS.DynamoDB.DocumentClient();
  const userId = getGamesRequest.userId;
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#pk = :pkey and begins_with(#sk, :skeybeginswith)',
    ExpressionAttributeNames:{
      '#pk': PRIMARY_KEY,
      '#sk': SORT_KEY
    },
    ExpressionAttributeValues: {
      ':pkey': userId,
      ':skeybeginswith': 'CREATED'
    }
  };

  try {
    let result = null;
    console.log('GET request params: ' + JSON.stringify(params));
    const getItem: Promise<any> = await db.query(params).promise();
    console.log(JSON.stringify(getItem))
    return { 
      statusCode: 200, 
      body: JSON.stringify(getItem) , 
      headers: headersConfig
    };
  } catch (dbError) {
    // const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    // DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    console.log(dbError.message);
    console.log(JSON.stringify(dbError));
    return { 
      statusCode: 500, body: dbError.message 
    };
  }
};

export const transactNewgame= async (request: CreateNewGameRequest) : Promise <any> => {

  // console.log('will this uuid work' + Guid.create());
  let dateToday = new Date();
  // Need to declare this within the method in order for mocking to work correctly
  let ddb = new AWS.DynamoDB.DocumentClient();  
  console.log('Received request: ' + JSON.stringify(request));
  let userItem: any = request.other_attributes;
  userItem[PRIMARY_KEY] = request.userId;

  let gameId = dateToday.toISOString() + "-game";

  userItem[SORT_KEY] = 'CREATED' + '|' + gameId + '|' + 1;

  userItem[CREATED_TIME_KEY] = dateToday.toISOString();

  let gameItem: any = {};
  gameItem[PRIMARY_KEY] = gameId;
  gameItem[SORT_KEY] = 'CREATED'+'|'+ request.userId;
  gameItem[CREATED_TIME_KEY] = dateToday.toISOString();

  try {
    const params = {
      TransactItems: [{
        Put: {
          TableName: TABLE_NAME,
          Item: userItem
        }
      }, {
        Put: {
          TableName: TABLE_NAME,
          Item: gameItem
        }
      }]
    };

    console.log('Creating new game with parameters: ' + JSON.stringify(params));

    const transactItems: Promise<any> = await ddb.transactWrite(params).promise();

    console.log(JSON.stringify(params));
    console.log('transactItems response' + JSON.stringify(transactItems));
    return { 
      statusCode: 200, 
      body: JSON.stringify(params), 
      headers: headersConfig
    };
  } catch (dbError) {
    // const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    // DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    console.log('There was an erorr in the PUT request: ' + dbError.message)
    console.log(JSON.stringify(dbError));
    return { 
      statusCode: 500, body: dbError.message 
    };
  }
};