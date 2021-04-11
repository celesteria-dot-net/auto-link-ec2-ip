#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AutoLinkEc2IpStack } from '../lib/auto-link-ec2-ip-stack';

const app = new cdk.App();
// eslint-disable-next-line no-new
new AutoLinkEc2IpStack(app, 'AutoLinkEc2IpStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
