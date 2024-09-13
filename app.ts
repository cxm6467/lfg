import { Client, ClientOptions, GatewayIntentBits } from 'discord.js';
import dotenv  from 'dotenv';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';

dotenv.config();

export const  handler = async () => {
  const clientOptions: ClientOptions = {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  };
  const client = new Client(clientOptions);

  client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    await mongooseConnectionHelper();
  });

  client.login(process.env.DISCORD_BOT_TOKEN);
}