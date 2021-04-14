import * as cdk from '@aws-cdk/core';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { Rule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import env from './utils/env';

// eslint-disable-next-line import/prefer-default-export
export class AutoLinkEc2IpStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostZone = new PublicHostedZone(this, 'DefaultHostedZone', {
      zoneName: 'celesteria.net',
      comment: 'This hostzone is managed by AWS CDK App.',
    });

    const attachIpFunc = new NodejsFunction(this, 'attach-ip-func', {
      environment: {
        HOSTZONEID: hostZone.hostedZoneId,
        DISCORD_TOKEN: env.DISCORD_TOKEN,
      },
    });

    [
      new PolicyStatement({
        resources: ['*'],
        actions: ['ec2:DescribeInstances', 'ec2:DescribeVpcs'],
      }),
      new PolicyStatement({
        actions: [
          'route53:CreateHostedZone',
          'route53:ChangeResourceRecordSets',
        ],
        resources: [
          'arn:aws:route53:::hostedzone/*',
          `arn:aws:ec2:*:${cdk.Aws.ACCOUNT_ID}:vpc/*`,
        ],
      }),
    ].forEach((policy) => attachIpFunc.addToRolePolicy(policy));

    new Rule(this, 'attachIpFunc-Schedule', {
      eventPattern: {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification'],
        detail: {
          state: ["running", "stopping"]
        }
      },
    }).addTarget(new LambdaFunction(attachIpFunc));
  }
}
