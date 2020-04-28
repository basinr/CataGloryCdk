import * as Aws from 'aws-sdk';
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const TABLE_NAME = 'TheOneToRuleThemAll';
export const PRIMARY_KEY = 'PartitionKey';
export const PRIMARY_SORT_KEY = 'SortKey';
export const GSI_KEY = 'Gsi';
export const GSI_SORT_KEY = 'GsiSortKey';

export interface DynamoItem {
  PartitionKey: string,
  SortKey: string,
  Gsi?: string,
  GsiSortKey?: string,
  CreatedDateTime?: string
}

export function put(item: DynamoItem): Promise<void> {
  console.log("Dynamo Object that is being put : " + JSON.stringify(item));

  const ddb = new Aws.DynamoDB.DocumentClient();
  
  const putParams: DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: item
  };
  
  return ddb.put(putParams).promise().then();
}

export interface IndexQuery {
  indexName: string,
  indexValue: string
}

export interface SortKeyQuery {
  sortKeyName: string,
  sortKeyPrefix: string
}

export async function getItemsByIndexAndSortKey(indexQuery: IndexQuery, sortKeyQuery?: SortKeyQuery): Promise<{[key: string]: any}[]> {
  const ddb = new Aws.DynamoDB.DocumentClient();

  let conditionExpression = '#k = :key';
  if (sortKeyQuery) {
    conditionExpression += ' and begins_with(#sk, :skeybeginswith)';
  }

  const getItemsRequest: DocumentClient.QueryInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: conditionExpression,
  }

  if (sortKeyQuery) {
    getItemsRequest.ExpressionAttributeNames = {
      '#k': indexQuery.indexName,
      '#sk': sortKeyQuery.sortKeyName
    };

    getItemsRequest.ExpressionAttributeValues = {
      ':key': indexQuery.indexValue,
      ':skeybeginswith': sortKeyQuery.sortKeyPrefix
    }
  } else {
    getItemsRequest.ExpressionAttributeNames = {
      '#k': indexQuery.indexName
    };

    getItemsRequest.ExpressionAttributeValues = {
      ':key': indexQuery.indexValue,
    }
  }

  if (indexQuery.indexName != PRIMARY_KEY) {
    getItemsRequest.IndexName = indexQuery.indexName;
  }

  console.log("Query Request for index, " + indexQuery.indexName + " : " 
    + " = " + JSON.stringify(getItemsRequest));

  return ddb.query(getItemsRequest).promise().then(response => response.Items ?? []);
}

export async function transactPut(...items: DynamoItem[]): Promise<void> {
  const ddb = new Aws.DynamoDB.DocumentClient();

  const transactWriteParams = {
    TransactItems: items.map(item => {
      return {
        Put: {
          TableName: TABLE_NAME,
          Item: item
        }
      }
    })
  } as DocumentClient.TransactWriteItemsInput;

  console.log(JSON.stringify(transactWriteParams));

  return ddb.transactWrite(transactWriteParams).promise().then(() => {});
}

export async function updateItemWithKeyChange(oldItem: DynamoItem, newItem: DynamoItem): Promise<void> {
  const ddb = new Aws.DynamoDB.DocumentClient();

  const transactWriteParams = {
    TransactItems: [
      { 
        Put: {
          TableName: TABLE_NAME,
          Item: newItem
        }
      }, {
        Delete: {
          TableName: TABLE_NAME,
          Key: {
            PartitionKey: oldItem.PartitionKey,
            SortKey: oldItem.SortKey
          }
        }
      }]
  } as DocumentClient.TransactWriteItemsInput;

  console.log(JSON.stringify(transactWriteParams));
  
  return ddb.transactWrite(transactWriteParams).promise().then(() => {});
}

export async function updateItemsWithKeyChange(oldItems: DynamoItem[], newItems: DynamoItem[]): Promise<void> {
  const ddb = new Aws.DynamoDB.DocumentClient();

  console.log("old items: " + JSON.stringify(oldItems));
  console.log("new items: " + JSON.stringify(newItems));

  const deleteTransactItem = oldItems.map(item => {
    return {
      Delete: {
        TableName: TABLE_NAME,
        Key: {
          PartitionKey: item.PartitionKey,
          SortKey: item.SortKey
        }
      }
    }
  }) as DocumentClient.TransactWriteItem[];

  const newTransactItem = newItems.map(item => {
    return {
      Put: {
        TableName: TABLE_NAME,
        Item: item
      }
    }
  }) as DocumentClient.TransactWriteItem[];

  const transactWriteParams = {
    TransactItems: [...deleteTransactItem, ...newTransactItem]
  } as DocumentClient.TransactWriteItemsInput;

  console.log(JSON.stringify(transactWriteParams));
  
  return ddb.transactWrite(transactWriteParams).promise().then(() => {});
}
