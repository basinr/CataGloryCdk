import * as cdk from '@aws-cdk/core';
import dynamodb = require('@aws-cdk/aws-dynamodb');
import { Function, Runtime, Code, AssetCode } from '@aws-cdk/aws-lambda';
import { LambdaRestApi, CfnAuthorizer, LambdaIntegration, AuthorizationType, IResource, MockIntegration, PassthroughBehavior } from '@aws-cdk/aws-apigateway';
import { UserPool } from '@aws-cdk/aws-cognito';
import CatagloryCognitoResources from './cognito_resources';

export class CataGloryCdkStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    let userGameTablePartitionKey: string = 'PartitionKey';
    let userGameTableSortKey: string = 'SortKey';

    const userGameTable = new dynamodb.Table(this, 'TheOneToRuleThemAll', {
      partitionKey: {
        name: userGameTablePartitionKey,
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: userGameTableSortKey, 
        type: dynamodb.AttributeType.STRING
      },
      tableName: 'TheOneToRuleThemAll',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const backEndFunction = new Function(this, 'backEndFunction', {
      code: new AssetCode('src'),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: userGameTable.tableName,
        PRIMARY_KEY: userGameTablePartitionKey,
        SORT_KEY: userGameTableSortKey
      }
    });

    userGameTable.grantReadWriteData(backEndFunction)

    const backendApiGateway = new LambdaRestApi(this, 'games', {
      restApiName: 'CataGlory Backend Service',
      handler: backEndFunction,
      proxy: false,
    });

    const userPool = CatagloryCognitoResources.createUserPoolResources(this);

    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: backendApiGateway.restApiId,
      name: 'CatagloryBackAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    const game = backendApiGateway.root.addResource('GAME');
    const backEndFunctionIntegration = new LambdaIntegration(backEndFunction);
    game.addMethod('POST', backEndFunctionIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
    game.addMethod('GET', backEndFunctionIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
    addCorsOptions(game);
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Access-Control-Allow-Origin,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },  
    }]
  })
}
