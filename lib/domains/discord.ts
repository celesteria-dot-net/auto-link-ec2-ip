import { Webhook, MessageBuilder } from 'discord-webhook-node';
import env from '../utils/env';

const webhook = new Webhook(env.DISCORD_TOKEN);
webhook.setUsername('EC2-Auto-Link-Ip');
webhook.setAvatar('https://i.gyazo.com/6cfe09c275242cd62647a3f90ca039e6.png');

const sendEmbed = (embed: MessageBuilder): Promise<void> => webhook.send(embed)

export default sendEmbed;
