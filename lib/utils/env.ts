import { load } from 'ts-dotenv';

const env = load({
  DISCORD_TOKEN: String
})

export default env
