import { CreateNewGameRequest, GetGamesRequest } from "./gameManager";

const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SORT_KEY = process.env.SORT_KEY || '';
const GAME_STATE_KEY: string = 'GAME_STATE'

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

const headersConfig = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
  'Access-Control-Allow-Origin': '*',
  'X-Requested-With': '*'
}

enum GameState {
  CREATED,
  ROUND_IN_PROGRESS
}

export const putNewGame= async (request: CreateNewGameRequest) : Promise <any> => {
  let item: any = request.other_attributes;
  item[PRIMARY_KEY] = item.userId;
  item[SORT_KEY] = 'CREATED' + '|' + item.gameId + '|' + request.roundNum;
  item[GAME_STATE_KEY] = GameState.CREATED.toString;

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

// KeyConditions: {
//   PRIMARY_KEY: {
//     ComparisonOperator: 'EQ',
//     AttributeValueList: [primaryKey]
//   },
//   SORT_KEY : {
//     ComparisonOperator: 'BEGINS_WITH',
//     AttributeValueList: ['CREATED']
//   }
// }

export const getGames = async (getGamesRequest: GetGamesRequest) : Promise <any> => {
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