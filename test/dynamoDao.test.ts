import { CreateNewGameRequest, GetGamesForUserRequest, GetGameRequest } from "../src/gameManager";
import { getItemsByKey, DynamoItem, put} from "../src/dynamoDao";
import * as AWSMock from "aws-sdk-mock";
import * as Aws from 'aws-sdk';
import { Converter, PutItemInput,QueryInput,QueryOutput } from "aws-sdk/clients/dynamodb";
import * as sinon from "sinon";
import { assert } from "console";

describe('dynamoDao', () => {
  const TABLE_NAME = 'TheOneToRuleThemAll';
  const PRIMARY_KEY = 'PartitionKey';

  beforeEach(() => {
    AWSMock.setSDKInstance(Aws);
  })
         
  describe('putItemsTransaciton', () => {
    const fakeDynamoObject = {
      PartitionKey: "pk",
      SortKey: "sk",
      Gsi: "gsi",
      GsiSortKey: "gsiSort"
    } as DynamoItem;

    const expectedPutItemsResponse = {
      PartitionKey: "testPk", SortKey: "sortKey"
    }

    const expectedPutItemsRequest = {
      TransactItems: [{ 
          Put: {
            TableName: TABLE_NAME,
            Item: fakeDynamoObject
          }
        }]
    };

    it('calls returns the correct promise', async () => {
      AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: QueryInput, callback: Function) => {
        callback(null, expectedPutItemsResponse)
      });

      const putItems = await put(fakeDynamoObject);
      
      expect(putItems).toBe(expectedPutItemsResponse);

      AWSMock.restore('DynamoDB.DocumentClient', 'transactWrite');
    });

    it('calls query with the correct params', async () => {
      AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: QueryInput, callback: Function) => {
        expect(params).toMatchObject(expectedPutItemsRequest);
        
        callback(null, expectedPutItemsResponse)
      });

      await put(fakeDynamoObject);
    
      AWSMock.restore('DynamoDB.DocumentClient', 'transactWrite');
    })
  })

  describe('getItemsForKey', () => {
    const testKeyName = "testName";
    const testKey = "testPk";

    const fakeItems = [{
      testParitionKeyName: testKeyName,
      testPartitionKey: testKey
    }];
    const fakeDynamoResponse = {
      Items: fakeItems,
      Count: 5
    } as Aws.DynamoDB.DocumentClient.QueryOutput;

    const expectedQueryParams: Aws.DynamoDB.DocumentClient.QueryInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: testKeyName + ' = :keyVal',
      ExpressionAttributeValues: {
        ':keyVal':  testKey
      }
    };

    afterEach(() => {
      AWSMock.restore('DynamoDB.DocumentClient', 'query');
    });

    it('returns the correct promise', async () => {
      AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
        callback(null, fakeDynamoResponse)
      });

      const getItems = await getItemsByKey(testKeyName, testKey);

      expect(getItems).toBe(fakeItems);
    });

    it('calls dynamo with the correct parameters', async () => {
      AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
        expect(params).toMatchObject(expectedQueryParams);
        
        callback(null, fakeDynamoResponse)
      });

      await getItemsByKey(testKeyName, testKey);
    });

    describe('no items returned', async () => {
      it('returns an empty array', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          callback(null, {})
        });
  
        const getItems = await getItemsByKey(testKeyName, testKey);
  
        expect(getItems).toStrictEqual([]);
      });  
    });
  })
})