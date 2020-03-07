// https://cataglory.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=7ghhpt4ukpq44r0sgt5bm32i9u&redirect_uri=http://localhost

import { UserPool, CfnIdentityPool, CfnUserPoolIdentityProvider, CfnUserPoolDomain, UserPoolClient, CfnUserPoolResourceServer, CfnUserPoolClient } from '@aws-cdk/aws-cognito';
import { facebookSecret } from '../secrets.json';
import {Construct} from '@aws-cdk/core';


export default class CatagloryCognitoResources {
    static createUserPoolResources(scope: Construct): UserPool {
        const userPool = new UserPool(scope, "userPool", {
            selfSignUpEnabled: false
        });
      
        const facebookIdentityPool = new CfnUserPoolIdentityProvider(scope, "facebookIdentityPool", {
            userPoolId: userPool.userPoolId,
            providerName: "Facebook",
            providerType: "Facebook",
            providerDetails: {
                client_id: 206516657260300,
                client_secret: facebookSecret,
                authorize_scopes: "email"
            }
        });
    
        const userPoolClient = new CfnUserPoolClient(scope, 'userPoolClient', {
            userPoolId: userPool.userPoolId,
            allowedOAuthFlows: [
                'code'
            ],
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthScopes: [
                'openid'
            ],
            callbackUrLs: [ "http://localhost" ],
            generateSecret: true,
            supportedIdentityProviders: [
                'Facebook'
            ]
        });
    
        userPoolClient.addDependsOn(facebookIdentityPool);
        
        new CfnUserPoolDomain(scope, "userPoolDomain", {
            userPoolId: userPool.userPoolId,
            domain: "cataglory"
        });

        return userPool;          
    }
}