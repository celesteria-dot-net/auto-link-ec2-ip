import {
  Route53Client,
  ChangeResourceRecordSetsRequest,
  ChangeResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommandOutput,
} from '@aws-sdk/client-route-53';

const client = new Route53Client({});

const changeResourceRecordSets = async (
  query: ChangeResourceRecordSetsRequest,
): Promise<ChangeResourceRecordSetsCommandOutput> =>
  client.send(new ChangeResourceRecordSetsCommand(query));

export default changeResourceRecordSets;
