/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-console */
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
    state: 'running' | 'stopping' | 'shutting-down';
  };
};

// eslint-disable-next-line import/prefer-default-export
export const handler = async (
  event: ec2InstanceStateChangeEvent,
): Promise<void> => {
  const isRunning = event.detail.state === 'running';
  const action = isRunning ? 'UPSERT' : 'DELETE';

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

  const embed = new MessageBuilder()
    .setTitle('EC2 Instance Status Change')
    .addField('インスタンスタイプ', `${instance?.InstanceType}`, true)
    .addField('インスタンスID', `${instance?.InstanceId}`, true)
    .addField('ライフサイクル', `${instance?.InstanceLifecycle}`, true)
    .addField('状態', `${instance?.State?.Name}`, true)
    .addField('IPアドレス', `${instance?.PublicIpAddress}`, true);

  if (!instance || !subDomain || !ipAddress) {
    const message = `インスタンスが${
      isRunning ? '起動' : '停止・終了'
    }しましたが、レコードの追加対象であるインスタンスではありませんでした`;
    embed.setDescription(message);
    await sendEmbed(embed);

    return console.log(message);
  }

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

  await changeResourceRecordSets(route53Query)
    .then(() => console.log('Route53のリソースレコードを変更しました'))
    .catch((err) => {
      console.error('Route53のリソースレコードを変更できませんでした');
      console.error(err);
    })
    .finally(() => {
      console.log(`インスタンスID: ${instance.InstanceId}`);
      console.log(`インスタンスの状態: ${instance.State?.Name}`);
    });

  const embedDescription = isRunning
    ? 'インスタンスが起動したため、IPとドメインの紐付けを行いました'
    : 'インスタンスが停止・終了したため、IPとドメインの紐付けを解除しました';
  const embedColor = isRunning ? 3447003 : 15105570;

  embed
    .setColor(embedColor)
    .setDescription(embedDescription)
    .addField('ドメイン名', hostName, true);

  return sendEmbed(embed);
};
