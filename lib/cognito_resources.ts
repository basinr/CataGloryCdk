// https://cataglory.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=258qmlhuh1a2h2h2a8d5qg82q6&redirect_uri=http://localhost:3000/

import { UserPool, CfnIdentityPool, CfnUserPoolIdentityProvider, CfnUserPoolDomain, UserPoolClient, CfnUserPoolResourceServer, CfnUserPoolClient } from '@aws-cdk/aws-cognito';
import { facebookSecret } from '../secrets.json';
import {Construct} from '@aws-cdk/core';


export default class CatagloryCognitoResources {
    static createUserPoolResources(scope: Construct, callbackUrl: string): UserPool {
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
            callbackUrLs: [ callbackUrl, "http://localhost:3000/" ],
            logoutUrLs: [ callbackUrl, "http://localhost:3000/" ],
            generateSecret: false,
            supportedIdentityProviders: [
                'Facebook'
            ]
        });
    
        userPoolClient.addDependsOn(facebookIdentityPool);
        
        new CfnUserPoolDomain(scope, "userPoolDomain", {
            userPoolId: userPool.userPoolId,
            // cataglory-dev: Ronnie
            domain: "cataglory-dev"
        });

        return userPool;          
    }
}