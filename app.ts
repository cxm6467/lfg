import { Client, ClientOptions, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv  from 'dotenv';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';
import { GroupModel } from './models/group';
import { IWoWGroup } from './interfaces';
import { DungeonName, DungeonType } from './enums';

dotenv.config();


const clientOptions: ClientOptions = {
    intents: [GatewayIntentBits.Guilds],
  };

const client = new Client(clientOptions);


const commands = [
  new SlashCommandBuilder()
    .setName('lfm')
    .setDescription('Looking for group command'),
  new SlashCommandBuilder()
    .setName('lg')
    .setDescription('List groups command'),
];

// Register commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands globally.');
    await rest.put(
      Routes.applicationCommands('1283651337111867473'),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands globally.');
  } catch (error) {
    console.error(error);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if(!interaction.isChatInputCommand()) return;
  console.log(`Interaction received: ${interaction.commandName}`);

  const group:IWoWGroup = {
    groupName: 'Test Group',
    dungeon: {
      name: DungeonName.Any,
      type: DungeonType.Mythic,
      level: 10,
    },
    channelId: interaction.channel?.id,
    guildId: interaction.guild?.id,
    threadId: interaction.channel?.isThread() ? interaction.channel?.id : undefined,
    embedId: interaction.id,
    messageId: interaction.id,
  }

  // await GroupModel.deleteMany();
  await GroupModel.create(group);

  const groups = await GroupModel.find();
  console.log(groups.length);
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupMessage = await interaction.channel?.messages.fetch({
      around: group.messageId,
      limit: 1,
    }).then(messages => messages.first());
    
    if (groupMessage) {
      console.log(`Group message found: ${groupMessage.content}`);
      await groupMessage.react('✅');
      console.log(`Reacted with ✅ to group message`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      await groupMessage.reactions.cache.get('✅')?.remove();
      console.log(`Removed ✅ reaction from group message`);
      await groupMessage.react('❌');
      console.log(`Reacted with ❌ to group message`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      await groupMessage.reactions.cache.get('❌')?.remove();
      console.log(`Removed ❌ reaction from group message`);
    }
  }
});
client.once(Events.ClientReady, async (readyClient ) => {
  console.log(`Logged in as ${readyClient .user?.tag}`);
  await mongooseConnectionHelper();
  registerCommands();
  console.log(await GroupModel.find());
});
client.login(process.env.DISCORD_BOT_TOKEN!);
