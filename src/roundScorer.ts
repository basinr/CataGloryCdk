import { DynamoDBStreamEvent, Context, Callback, DynamoDBRecord } from "aws-lambda";
import { Converter } from 'aws-sdk/clients/dynamodb';
import { DynamoItem } from "./dao/dynamoDao";
import { scoreRound } from "./roundScoring/roundScorerManager";

export const handler = (event: DynamoDBStreamEvent, context: Context, callback: Callback) => {
    event.Records.forEach((value: DynamoDBRecord) => {
        if (value.dynamodb && value.dynamodb.NewImage && value.eventName === 'INSERT') {
            const newItem = Converter.unmarshall(value.dynamodb.NewImage) as DynamoItem;

            scoreRound(newItem);
        }
    });
};