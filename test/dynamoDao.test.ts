import { DynamoItem, put, getItemsByIndexAndSortKey, IndexQuery, SortKeyQuery} from "../src/dynamoDao";
import * as AWSMock from "aws-sdk-mock";
import * as Aws from 'aws-sdk';
import { QueryInput } from "aws-sdk/clients/dynamodb";

describe('dynamoDao', () => {
  const TABLE_NAME = 'TheOneToRuleThemAll';
  const PRIMARY_KEY = 'PartitionKey';

  beforeEach(() => {
    AWSMock.setSDKInstance(Aws);
  });
         
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

  describe('getItemsByKeyWithSortKeyPrefix', () => {
    const testKeyName = "testName";
    const testKey = "testPk";
    const testSortKeyName = "testSortKeyName";
    const testSortKeyPrefix = "testPrefix";

    const fakeItems = [{
      testParitionKeyName: testKeyName,
      testPartitionKey: testKey
    }];
    const fakeDynamoResponse = {
      Items: fakeItems,
      Count: 5
    } as Aws.DynamoDB.DocumentClient.QueryOutput;

    const sampleKeyQuery: IndexQuery = {
      indexName: testKeyName, 
      indexValue: testKey
    };
    const sampleSortQuery: SortKeyQuery = {
      sortKeyName: testSortKeyName, 
      sortKeyPrefix: testSortKeyPrefix
    };


    afterEach(() => {
      AWSMock.restore('DynamoDB.DocumentClient', 'query');
    });

    describe('sort key index is not defined', () => {
      const expectedQueryParams: Aws.DynamoDB.DocumentClient.QueryInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: '#k = :key',
        ExpressionAttributeNames: {
          '#k': testKeyName
        },
        ExpressionAttributeValues: {
          ':key':  testKey
        }
      };
  
      it('returns the correct promise', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          callback(null, fakeDynamoResponse)
        });
  
        const getItems = await getItemsByIndexAndSortKey(sampleKeyQuery);
  
        expect(getItems).toBe(fakeItems);
      });
  
      it('calls dynamo with the correct parameters', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          expect(params).toMatchObject(expectedQueryParams);
          
          callback(null, fakeDynamoResponse)
        });
  
        await getItemsByIndexAndSortKey(sampleKeyQuery);
      });
  
      describe('no items returned', () => {
        it('returns an empty array', async () => {
          AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
            callback(null, {})
          });
    
          const getItems = await getItemsByIndexAndSortKey(sampleKeyQuery);
    
          expect(getItems).toStrictEqual([]);
        });  
      });  
    });

    describe('sort key index is defined', () => {
      const expectedQueryParams: Aws.DynamoDB.DocumentClient.QueryInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: '#k = :key and begins_with(#sk, :skeybeginswith)',
        ExpressionAttributeNames:{
          '#k': testKeyName,
          '#sk': testSortKeyName
        },
        ExpressionAttributeValues: {
          ':key': testKey,
          ':skeybeginswith': testSortKeyPrefix
        }
      };
  

      it('returns the correct promise', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          callback(null, fakeDynamoResponse)
        });
  
        const getItems = await getItemsByIndexAndSortKey(sampleKeyQuery, sampleSortQuery);
  
        expect(getItems).toBe(fakeItems);
      });
  
      it('calls dynamo with the correct parameters', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          expect(params).toMatchObject(expectedQueryParams);
          
          callback(null, fakeDynamoResponse)
        });
  
        await getItemsByIndexAndSortKey(sampleKeyQuery, sampleSortQuery);
      });
  
      describe('no items returned', async () => {
        it('returns an empty array', async () => {
          AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
            callback(null, {})
          });
    
          const getItems = await getItemsByIndexAndSortKey(sampleKeyQuery, sampleSortQuery);
    
          expect(getItems).toStrictEqual([]);
        });  
      });
    });  
  });
});
