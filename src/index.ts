import app from './app';
import awsServerlessExpress from 'aws-serverless-express';

const server = awsServerlessExpress.createServer(app, undefined, ['application/json']);

export const handler = (event: any, context: any) => awsServerlessExpress.proxy(server, event, context);
