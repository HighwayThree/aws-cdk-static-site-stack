#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as dotenv from 'dotenv';
import { StaticSite } from '../lib/static-site-stack';
dotenv.config();

const app = new cdk.App();
new StaticSite(app, 'dev', 
    {
        STACK_SSL_CERTIFICATION_ARN: process.env.STACK_SSL_CERTIFICATION_ARN || '',
        SUB_DOMAIN_NAME: process.env.SUB_DOMAIN_NAME || '',
        DOMAIN_NAME: process.env.DOMAIN_NAME || ''
    },
    { 
        stackName: 'static-site-test',
        env: { 
            account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT, 
        }
    }
);