/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';

// eslint-disable-next-line import/prefer-default-export
export class AutoLinkEc2IpStack extends cdk.Stack {
  // eslint-disable-next-line no-useless-constructor
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostZone = new route53.PublicHostedZone(this, 'DefaultHostZone', {
      zoneName: 'celesteria.net',
      comment: 'This hostzone is managed by AWS CDK.',
    });
  }
}
