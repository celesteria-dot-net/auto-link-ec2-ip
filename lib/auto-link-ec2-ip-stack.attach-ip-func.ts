import { ChangeResourceRecordSetsCommandOutput } from '@aws-sdk/client-route-53';
import fetchInstances from './domains/ec2';
import changeResourceRecordSets from './domains/route53';

type ec2InstanceStateChangeEvent = {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: {
    'instance-id': string;
    state: string;
  };
};

// eslint-disable-next-line import/prefer-default-export
export const handler = async (
  event: ec2InstanceStateChangeEvent,
): Promise<void | ChangeResourceRecordSetsCommandOutput> => {
  const action = (() => {
    switch (event.detail.state) {
      case 'running':
        return 'UPSERT';
      case 'stopping':
        return 'DELETE';
      default:
        return '';
    }
  })();

  const query = {
    InstanceIds: [event.detail['instance-id']],
  };
  const outputs = await fetchInstances(query);

  // 一意のインスタンスIDが1つだけ指定されたイベントが発生し、それをもとに取得してきているので、考慮するインスタンスは1つだけでよい
  const instance = outputs.Reservations?.flatMap(
    (res) => res.Instances ?? [],
  )?.find((ins) => ins.Tags?.flatMap((tag) => tag.Key?.includes('hostName')));
  const subDomain = instance?.Tags?.find((tag) => tag.Key === 'hostName')
    ?.Value;
  const ipAddress = instance?.PublicIpAddress;

  if (!action || !instance || !subDomain || !ipAddress) return undefined;

  // メモ：最後のピリオドはタイプミスではない
  const hostName = `${subDomain}.celesteria.net.`;
  const route53Query = {
    HostedZoneId: process.env.HOSTZONEID,
    ChangeBatch: {
      Changes: [
        {
          Action: action,
          ResourceRecordSet: {
            Name: hostName,
            Type: 'A',
            // 5分
            TTL: 60 * 5,
            ResourceRecords: [
              {
                Value: ipAddress,
              },
            ],
          },
        },
      ],
    },
  };

  return changeResourceRecordSets(route53Query);
};
