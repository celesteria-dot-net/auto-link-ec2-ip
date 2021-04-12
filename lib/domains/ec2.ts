import {
  EC2Client,
  DescribeInstancesRequest,
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
} from '@aws-sdk/client-ec2';

const client = new EC2Client({});

const fetchInstances = async (
  query: DescribeInstancesRequest,
): Promise<DescribeInstancesCommandOutput> =>
  client.send(new DescribeInstancesCommand(query));

export default fetchInstances;
