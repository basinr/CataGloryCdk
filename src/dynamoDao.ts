import { CreateNewGameRequest, GetGamesForUserRequest, GetGameRequest } from "./gameManager";
import * as Aws from 'aws-sdk';
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const TABLE_NAME = 'TheOneToRuleThemAll';
export const PRIMARY_KEY = 'PartitionKey';
export const GSI_KEY = 'Gsi';
const SORT_KEY = 'SortKey';
const GAME_STATE_KEY: string = 'GAME_STATE';
const CREATED_TIME_KEY = 'CreatedTime';

// todo: Make use of this for individual row updates or inserts?
export const updateGame= async (request: CreateNewGameRequest) : Promise <any> => {
  let dateToday = new Date();
  // Need to declare this within the method in order for mocking to work correctly
  let db = new Aws.DynamoDB.DocumentClient();
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
    return await db.put(put_params).promise();
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
  let db = new Aws.DynamoDB.DocumentClient();
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
    return await db.query(params).promise();
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
  let db = new Aws.DynamoDB.DocumentClient();
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
    return await db.query(params).promise();
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
  let db = new Aws.DynamoDB.DocumentClient();
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
    return await db.query(params).promise();
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

export interface DynamoItem {
  PartitionKey: string,
  SortKey: string,
  Gsi: string,
  GsiSortKey: string,
  CreatedDateTime: string
}

export function put(item: DynamoItem): Promise<void> {
  const ddb = new Aws.DynamoDB.DocumentClient();
  
  const transactionParams: DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: item
  };
  
  return ddb.put(transactionParams).promise().then();
}


export function getItemsByKey(keyName: string, key: string): Promise<{[key: string]: any}[]> {
  const ddb = new Aws.DynamoDB.DocumentClient();

  const getItemsRequest: DocumentClient.QueryInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyName + ' = :keyVal',
    IndexName: keyName,
    ExpressionAttributeValues: {
      ':keyVal': key
    }
  }

  console.log("Query Request for key : " + keyName + " with value : " 
    + " = " + JSON.stringify(getItemsRequest));

  return ddb.query(getItemsRequest).promise().then(response => {
    if (response.Items == null) {
      return [];
    }

    return response.Items;
  });
}
