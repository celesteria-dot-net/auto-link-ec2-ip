import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as AutoLinkEc2Ip from '../lib/auto-link-ec2-ip-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AutoLinkEc2Ip.AutoLinkEc2IpStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT,
    ),
  );
});
