import * as cdk from '@aws-cdk/core';
import { Function, Runtime, Code, AssetCode } from '@aws-cdk/aws-lambda';
import { LambdaRestApi, CfnAuthorizer, LambdaIntegration, AuthorizationType } from '@aws-cdk/aws-apigateway';
import { UserPool, CfnIdentityPool, CfnUserPoolIdentityProvider, CfnUserPoolDomain } from '@aws-cdk/aws-cognito';
import { facebookSecret } from '../secrets.json';

export class CataGloryCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backEndFunction = new Function(this, 'backEndFunction', {
      code: new AssetCode('src'),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X
    });

    const backendApiGateway = new LambdaRestApi(this, 'backendApiGateway', {
      restApiName: 'Cataglory Backend',
      handler: backEndFunction,
      proxy: false,
    });

    const userPool = new UserPool(this, "userPool", {
      selfSignUpEnabled: false
    });

    const facebookIdentityPool = new CfnUserPoolIdentityProvider(this, "facebookIdentityPool", {
      userPoolId: userPool.userPoolId,
      providerName: "Facebook",
      providerType: "Facebook",
      providerDetails: {
        client_id: 206516657260300,
        client_secret: facebookSecret,
        authorize_scopes: "email"
      }
    });

    const userPoolDomain = new CfnUserPoolDomain(this, "userPoolDomain", {
      userPoolId: userPool.userPoolId,
      domain: "cataglory"
    });
    
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: backendApiGateway.restApiId,
      name: 'CatagloryBackAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    const game = backendApiGateway.root.addResource('GAME');

    game.addMethod('GET', new LambdaIntegration(backEndFunction), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    });
  }
}
