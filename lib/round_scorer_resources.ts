import dynamodb = require('@aws-cdk/aws-dynamodb');
import {Construct} from '@aws-cdk/core';
import { Runtime, AssetCode, StartingPosition, Function } from '@aws-cdk/aws-lambda';
import { Queue } from '@aws-cdk/aws-sqs'
import { DynamoEventSource, SqsDlq } from '@aws-cdk/aws-lambda-event-sources';

export default (scope: Construct, table: dynamodb.Table) => {
    const roundScorerFunction = new Function(scope, 'roundScorerFunction', {
        code: new AssetCode('src'),
        handler: 'roundScorer.handler',
        runtime: Runtime.NODEJS_10_X,
        environment: {
          TABLE_NAME: table.tableName
        }
      });
  
      const roundEndingDLQ = new Queue(scope, 'RoundEndDLQ');
  
      roundScorerFunction.addEventSource(new DynamoEventSource(table, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 5,
        onFailure: new SqsDlq(roundEndingDLQ),
        retryAttempts: 10
      }));

      table.grantReadWriteData(roundScorerFunction);
  }