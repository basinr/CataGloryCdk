import { CreateNewGameRequest, GetGamesForUserRequest, GetGameRequest } from "../src/gameManager";
import { updateGame,getGamesForUser,getGame} from "../src/dynamoDao";
import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk"; 
import { PutItemInput,QueryInput } from "aws-sdk/clients/dynamodb";
import * as sinon from "sinon";

describe('GetGamesForUser', () => {
  jest.setTimeout(30000);
it('should respond with correct values', async () => {
    let testPartitionKey = "testUserId";
    let testSortKey = "CREATED|0|1";

    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {PartitionKey: testPartitionKey, SortKey: testSortKey});
    })

    let getGamesRequest: GetGamesForUserRequest = {
        userId: testPartitionKey
    };

    const getGamesResponse = await getGamesForUser(getGamesRequest);

    const getGamesResponseBodyJson = JSON.parse(getGamesResponse['body']);

    expect(getGamesResponse['statusCode']).toBe(200);
    expect(getGamesResponseBodyJson['PartitionKey']).toBe(testPartitionKey);
    expect(getGamesResponseBodyJson['SortKey']).toBe(testSortKey);

    AWSMock.restore('DynamoDB.DocumentClient', 'query');
  });

  // it('should query items with correct parameters', async () => {
  //     let testPartitionKey = "testUserId";
  //     let testSortKey = "CREATED|0|1";
  //     let queryTableSpy = sinon.spy();

  //     jest.setTimeout(30000);
  //     AWSMock.setSDKInstance(AWS);
  //     // AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
  //     //   callback(null, {PartitionKey: testPartitionKey, SortKey: testSortKey});
  //     // })
  //     AWSMock.mock('DynamoDB.DocumentClient', 'query', queryTableSpy);

  //     let getGamesRequest: GetGamesRequest = {
  //         userId: testPartitionKey
  //     };

  //     const getGamesResponse = await getGames(getGamesRequest);
  //     console.log('spy stuff: '+ queryTableSpy.getCalls);
  //     expect(queryTableSpy.calledOnce).toBeTruthy();
  // });
})

describe('GetGame', () => {
  it('should get game info', async () => {
    let gameId = "testGameId";

    let testPartitionKey = gameId;
    let testSortKey = "testGameId|1";

    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (params: QueryInput, callback: Function) => {
      callback(null, {PartitionKey: testPartitionKey, SortKey: testSortKey});
    })

    let getGamesRequest: GetGameRequest = {
      gameId: gameId
    };

    const getGameResponse = await getGame(getGamesRequest);

    const getGameResponseBodyJson = JSON.parse(getGameResponse['body']);

    expect(getGameResponse['statusCode']).toBe(200);
    expect(getGameResponseBodyJson['PartitionKey']).toBe(testPartitionKey);
    expect(getGameResponseBodyJson['SortKey']).toBe(testSortKey);

    AWSMock.restore('DynamoDB.DocumentClient', 'query');

  })
})

describe('CreateNewGame', () => {
  jest.setTimeout(30000);

  it('should update items', async () => {
      let testPartitionKey = "testUserId";
      let testSortKey = "CREATED|1|0";

      AWSMock.setSDKInstance(AWS);
      AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: PutItemInput, callback: Function) => {
        callback(null, {PartitionKey: testPartitionKey, SortKey: testSortKey});
      })

      let putItemRequest: CreateNewGameRequest = {
        userId: 'testUserId',
        other_attributes: {}
      }
      const newGameResponse = await updateGame(putItemRequest);

      const putResponseBodyJson = JSON.parse(newGameResponse['body']);

      expect(newGameResponse['statusCode']).toBe(200);
      expect(putResponseBodyJson['Item']['PartitionKey']).toBe(testPartitionKey);
      // expect(putResponseBodyJson['Item']['SortKey']).toBe(testSortKey); todo: use smarter expectation
    });
})  

    //todo unit test for transact items
