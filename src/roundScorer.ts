import { DynamoDBStreamEvent, Context, Callback, DynamoDBRecord } from "aws-lambda";
import { Converter } from 'aws-sdk/clients/dynamodb';
import { DynamoItem } from "./dao/dynamoDao";
import { scoreRound } from "./roundScoring/roundScorerManager";
import { handleReportAnswerEvent } from "./roundScoring/reportAnswerManager";

export const handler = (event: DynamoDBStreamEvent, context: Context, callback: Callback) => {
    event.Records.forEach((value: DynamoDBRecord) => {
        if (value.dynamodb && value.dynamodb.NewImage && value.dynamodb.OldImage && value.eventName === 'MODIFY') {
            const newItem = Converter.unmarshall(value.dynamodb.NewImage) as DynamoItem;
            const oldItem = Converter.unmarshall(value.dynamodb.OldImage) as DynamoItem;

            scoreRound(oldItem, newItem);
            handleReportAnswerEvent(oldItem, newItem);
        }
    });
};