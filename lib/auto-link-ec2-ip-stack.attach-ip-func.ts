/* eslint-disable no-console */
import { ChangeResourceRecordSetsCommandOutput } from '@aws-sdk/client-route-53';
import { MessageBuilder } from 'discord-webhook-node';
import fetchInstances from './domains/ec2';
import changeResourceRecordSets from './domains/route53';
import sendEmbed from './domains/discord';

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
      case 'shutting-down':
      case 'terminated':
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

  if (!action || !instance || !subDomain || !ipAddress)
    return console.log(
      'レコードの追加対象であるインスタンスではなかったので処理を終了しました。',
    );

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

  await changeResourceRecordSets(route53Query).catch((err) => {
    console.error('Route53のリソースレコードを変更できませんでした');
    console.error(err);
  });

  const embedDescription =
    action === 'UPSERT'
      ? 'インスタンスが起動したため、IPとドメインの紐付けを行いました'
      : 'インスタンスが終了したため、IPとドメインの紐付けを解除しました';

  const embed = new MessageBuilder()
    .setTitle('EC2 Instance Status Change')
    .setColor(1127128)
    .setDescription(embedDescription)
    .addField('ドメイン名', hostName, true)
    .addField('IPアドレス', instance.PublicIpAddress ?? '', true)
    .addField('状態遷移の理由', instance.StateTransitionReason ?? '')
    .addField('インスタンスタイプ', instance.InstanceType ?? '', true)
    .addField('インスタンスID', instance.InstanceId ?? '', true)
    .addField('ライフサイクル', instance.InstanceLifecycle ?? '', true);

  await sendEmbed(embed).catch((err) => {
    console.error('DiscordにEmbedを送信できませんでした');
    console.error(err);
  });
};
