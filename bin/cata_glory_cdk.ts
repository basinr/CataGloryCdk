#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CataGloryCdkStack } from '../lib/cata_glory_cdk-stack';

const app = new cdk.App();
new CataGloryCdkStack(app, 'CataGloryCdkStack');
