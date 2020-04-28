import * as cdk from '@aws-cdk/core';
import dynamodb = require('@aws-cdk/aws-dynamodb');
import { Function, Runtime, AssetCode, StartingPosition, QualifiedFunctionBase } from '@aws-cdk/aws-lambda';
import { LambdaRestApi, CfnAuthorizer, LambdaIntegration, AuthorizationType, IResource, MockIntegration, PassthroughBehavior, Cors } from '@aws-cdk/aws-apigateway';
import CatagloryCognitoResources from './cognito_resources';
import { Bucket } from '@aws-cdk/aws-s3';
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';
import round_scorer_resources from './round_scorer_resources';
import { StreamViewType } from '@aws-cdk/aws-dynamodb';

export class CataGloryCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userGameTablePartitionKey = 'PartitionKey';
    const userGameTableSortKey = 'SortKey';
    const userGameTableGsi = 'Gsi';
    const userGameTableGsiSortKey = 'GsiSortKey';

    // CataGlory-RonnieDev
    const staticWebsiteBucket = new Bucket(this, 'CataGlory-RonnieDev', {
      // catagloryronniedev: Ronnie
      bucketName: 'catagloryronniedev',
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    });

    const cloudFrontDistribution = new CloudFrontWebDistribution(this, 'MyDistribution', {
      originConfigs: [
          {
              s3OriginSource: {
                  s3BucketSource: staticWebsiteBucket
              },
              behaviors : [ {isDefaultBehavior: true}],
          }
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html'
        }
      ]
   });  

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
      stream: StreamViewType.NEW_AND_OLD_IMAGES
    });

    userGameTable.addGlobalSecondaryIndex({
      indexName: userGameTableGsi,
      partitionKey: {
        name: userGameTableGsi,
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: userGameTableGsiSortKey,
        type: dynamodb.AttributeType.STRING
      }
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

    round_scorer_resources(this, userGameTable);

    userGameTable.grantReadWriteData(backEndFunction);

    const backendApiGateway = new LambdaRestApi(this, 'games', {
      restApiName: 'CataGlory Backend Service',
      handler: backEndFunction,
      proxy: false
    });

    const userPool = CatagloryCognitoResources.createUserPoolResources(this, "https://" + cloudFrontDistribution.domainName + "/");

    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: backendApiGateway.restApiId,
      name: 'CatagloryBackAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    const backEndFunctionIntegration = new LambdaIntegration(backEndFunction);
    backendApiGateway.root.addProxy({
      defaultIntegration: backEndFunctionIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: {
          authorizerId: authorizer.ref
        }
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_METHODS
      }
    });
  }
}
