import { DynamoItem, put, getItemsByIndexAndSortKey, IndexQuery, SortKeyQuery, transactPut, GSI_KEY, GSI_SORT_KEY, PRIMARY_SORT_KEY, updateItemWithKeyChange, updateItemsWithKeyChange, appendToValue, bulkUpdateForParitionKey} from "../../src/dao/dynamoDao";
import * as AWSMock from "aws-sdk-mock";
import * as Aws from 'aws-sdk';
import { DocumentClient, QueryInput } from "aws-sdk/clients/dynamodb";


describe('dynamoDao', () => {
  const TABLE_NAME = 'TheOneToRuleThemAll';
  const PRIMARY_KEY = 'PartitionKey';

  beforeAll(() => {
    AWSMock.setSDKInstance(Aws);
  });

  afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
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
      TableName: TABLE_NAME,
      Item: fakeDynamoObject
    } as Aws.DynamoDB.DocumentClient.PutItemInput;

    it('calls put with the correct params', async () => {
      let timesCalled = 0;
      AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: Aws.DynamoDB.DocumentClient.PutItemInput, callback: Function) => {
        expect(params).toMatchObject(expectedPutItemsRequest);

        timesCalled++;
        
        callback(null, expectedPutItemsResponse)
      });

      await put(fakeDynamoObject);

      expect(timesCalled).toBe(1);
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


    describe('query on Primary Key', () => {
      const sampleKeyQuery: IndexQuery = {
        indexName: PRIMARY_KEY, 
        indexValue: testKey
      };
      const sampleSortQuery: SortKeyQuery = {
        sortKeyName: PRIMARY_SORT_KEY, 
        sortKeyPrefix: testSortKeyPrefix
      };  

      describe('sort key index is not defined', () => {
        const expectedQueryParams: Aws.DynamoDB.DocumentClient.QueryInput = {
          TableName: TABLE_NAME,
          KeyConditionExpression: '#k = :key',
          ExpressionAttributeNames: {
            '#k': PRIMARY_KEY
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
          let timesCalled = 0;
          AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
            timesCalled++;
            
            expect(params).toMatchObject(expectedQueryParams);
  
            
            callback(null, fakeDynamoResponse)
          });
    
          await getItemsByIndexAndSortKey(sampleKeyQuery);
  
          expect(timesCalled).toBe(1);
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
            '#k': PRIMARY_KEY,
            '#sk': PRIMARY_SORT_KEY
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
          let timesCalled = 0;
          AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {          
            expect(params).toMatchObject(expectedQueryParams);
  
            timesCalled++;
            
            callback(null, fakeDynamoResponse)
          });
    
          await getItemsByIndexAndSortKey(sampleKeyQuery, sampleSortQuery);
  
          expect(timesCalled).toBe(1);
        });
    
        describe('no items returned', () => {
          it('returns an empty array', async () => {
            AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
              callback(null, {} as Aws.DynamoDB.DocumentClient.QueryOutput)
            });
      
            const getItems = await getItemsByIndexAndSortKey(sampleKeyQuery, sampleSortQuery);
      
            expect(getItems).toStrictEqual([]);
          });  
        });
      });  
    });

    describe('query on GSI', () => {
      const sampleKeyQuery: IndexQuery = {
        indexName: GSI_KEY, 
        indexValue: testKey
      };

      const expectedQueryParams: Aws.DynamoDB.DocumentClient.QueryInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: '#k = :key',
        IndexName: GSI_KEY,
        ExpressionAttributeNames: {
          '#k': GSI_KEY
        },
        ExpressionAttributeValues: {
          ':key':  testKey
        }
      };

      it('calls dynamo with the correct parameters', async () => {
        let timesCalled = 0;
        AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
          timesCalled++;
          
          expect(params).toMatchObject(expectedQueryParams);

          
          callback(null, fakeDynamoResponse)
        });
  
        await getItemsByIndexAndSortKey(sampleKeyQuery);

        expect(timesCalled).toBe(1);
      });
    });
  });

  describe('transactPut', () => {
    const item1 = {
      PartitionKey: 'pk1',
      SortKey: 'sk1',
      CreatedDateTime: 'date'
    } as DynamoItem;
    const item2 = {
      PartitionKey: 'pk2',
      SortKey: 'sk2',
      CreatedDateTime: 'date'
    } as DynamoItem;

    const transactWriteParams = {
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: item1
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: item2
          }
        }
      ]
    } as DocumentClient.TransactWriteItemsInput;
  

    it('calls transactWrite with the correct params', async () => {
      let timesCalled = 0;
      AWSMock.mock('DynamoDB.DocumentClient', 'transactWrite', (params: Aws.DynamoDB.DocumentClient.PutItemInput, callback: Function) => {
        expect(params).toMatchObject(transactWriteParams);

        timesCalled++;
        
        callback(null, null)
      });

      await transactPut(item1, item2);

      expect(timesCalled).toBe(1);
    });
  });

  describe('updateItemWithKeyChange', () => {
    const oldItem = {
      PartitionKey: 'pk1',
      SortKey: 'sk1',
      CreatedDateTime: 'date'
    } as DynamoItem;
    const newIrem = {
      PartitionKey: 'pk1',
      SortKey: 'sk2',
      CreatedDateTime: 'date'
    } as DynamoItem;

    const transactWriteParams = {
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: newIrem
          }
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PartitionKey: oldItem.PartitionKey,
              SortKey: oldItem.SortKey
            }
          }
        }
      ]
    } as DocumentClient.TransactWriteItemsInput;
  

    it('calls transactWrite with the correct params', async () => {
      let timesCalled = 0;
      AWSMock.mock('DynamoDB.DocumentClient', 'transactWrite', (params: Aws.DynamoDB.DocumentClient.PutItemInput, callback: Function) => {
        expect(params).toMatchObject(transactWriteParams);

        timesCalled++;
        
        callback(null, null)
      });

      await updateItemWithKeyChange(oldItem, newIrem);

      expect(timesCalled).toBe(1);
    });
  });

  describe('updateItemsWithKeyChange', () => {
    const oldItems = [{
      PartitionKey: 'pk1',
      SortKey: 'sk1',
      CreatedDateTime: 'date'
    },{
      PartitionKey: 'pk2',
      SortKey: 'sk1',
      CreatedDateTime: 'date'
    }] as DynamoItem[];
    const newItems = [{
      PartitionKey: 'pk1',
      SortKey: 'sk2',
      CreatedDateTime: 'date'
    }, {
      PartitionKey: 'pk2',
      SortKey: 'sk2',
      CreatedDateTime: 'date'
    }] as DynamoItem[];

    const transactWriteParams = {
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: newItems[0]
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: newItems[1]
          }
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PartitionKey: oldItems[0].PartitionKey,
              SortKey: oldItems[0].SortKey
            }
          }
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PartitionKey: oldItems[1].PartitionKey,
              SortKey: oldItems[1].SortKey
            }
          }
        }
      ]
    } as DocumentClient.TransactWriteItemsInput;
  

    it('calls transactWrite with the correct params', async () => {
      let timesCalled = 0;
      AWSMock.mock('DynamoDB.DocumentClient', 'transactWrite', (params: Aws.DynamoDB.DocumentClient.TransactWriteItemsInput, callback: Function) => {
        expect(new Set(params.TransactItems)).toEqual(new Set(transactWriteParams.TransactItems.sort()));

        timesCalled++;
        
        callback(null, null)
      });

      await updateItemsWithKeyChange(oldItems, newItems);

      expect(timesCalled).toBe(1);
    });
  });
  
  describe('bulkUpdateForPartitionKey', () => {
    const samplePk = 'pk';
    const sortKey1 = 'sk1';
    const sortKey2 = 'sk2';
    const sortKey3 = 'sk3';
    const sortKeys = [sortKey1 , sortKey2, sortKey3];
    const value1 = 'value1';
    const value2 = 'value2';
    const attributeValues = [
      {
        name: 'attr1',
        value: value1
      },
      {
        name: 'attr2',
        value: value2
      }
    ];

    const expectedTransactParams = {
      TransactItems: [
        {Update: {
          TableName: TABLE_NAME,
          Key: {
            PartitionKey: samplePk,
            SortKey: sortKey1
          },
          UpdateExpression: 'SET attr1 = :v0, attr2 = :v1',
          ExpressionAttributeValues: {
            ':v0': value1,
            ':v1': value2
          }
        }},
        {Update: {
          TableName: TABLE_NAME,
          Key: {
            PartitionKey: samplePk,
            SortKey: sortKey2
          },
          UpdateExpression: 'SET attr1 = :v0, attr2 = :v1',
          ExpressionAttributeValues: {
            ':v0': value1,
            ':v1': value2
          }
        }},
        {Update: {
          TableName: TABLE_NAME,
          Key: {
            PartitionKey: samplePk,
            SortKey: sortKey3
          },
          UpdateExpression: 'SET attr1 = :v0, attr2 = :v1',
          ExpressionAttributeValues: {
            ':v0': value1,
            ':v1': value2
          }
        }}
      ]
    }

    it('updates dynamo with the correct params', async () => {
        let timesCalled = 0;
        AWSMock.mock('DynamoDB.DocumentClient', 'transactWrite', (params: Aws.DynamoDB.DocumentClient.PutItemInput, callback: Function) => {
          expect(params).toMatchObject(expectedTransactParams);

          timesCalled++;
          
          callback(null, null)
        });

        await bulkUpdateForParitionKey(samplePk, sortKeys, attributeValues);

        expect(timesCalled).toBe(1);
    });
  });
  

  describe('appendToValue', () => {
    const pk = 'pk';
    const sk = 'sk';
    const attribute = 'list';
    const append = ['blah'];

    const updateItem: Aws.DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: TABLE_NAME,
      Key: {
        PartitionKey: pk,
        SortKey: sk
      },
      UpdateExpression: 'set #a = list_append(:vals, #a)',
      ExpressionAttributeNames: {'#a': attribute},
      ExpressionAttributeValues: {':vals': append}
    }

    it('calls update with the correct params', async () => {
      let timesCalled = 0;
      AWSMock.mock('DynamoDB.DocumentClient', 'update', (params: Aws.DynamoDB.DocumentClient.UpdateItemInput, callback: Function) => {
        expect(params).toStrictEqual(updateItem);

        timesCalled++;

        callback(null, null)
      });

      await appendToValue(pk, sk, attribute, append);
      expect(timesCalled).toBe(1);
    })
  });
});
