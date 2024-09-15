import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv  from 'dotenv';
import { mongooseConnectionHelper, registerCommands, processResponse, reactToMessage } from './services/';
import { GroupModel } from './models/group';


dotenv.config();

const client = new Client( {
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient ) => {
  console.log(`Logged in as ${readyClient .user?.tag}`);
  await mongooseConnectionHelper();
  await registerCommands();
  const groups = await GroupModel.find();
  if(groups.length > 0) console.log(groups.map(group => ({ messageId: group.messageId, groupName: group.groupName, guildId: group.guildId, channelId: group.channelId })));
  for (const group of groups) {
    await reactToMessage(client, group);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if(!interaction.isChatInputCommand()) return;
  console.log(`Interaction received: ${interaction.commandName}`);
  if(interaction.commandName === 'lfm') await processResponse(interaction);
});

client.login(process.env.DISCORD_BOT_TOKEN!);
