import { ChatInputCommandInteraction, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv  from 'dotenv';
import { mongooseConnectionHelper, registerCommands, processInteractionResponse, reactToMessage, processModalSubmit } from './services/';
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
  if(interaction.isCommand()){
    console.log(`Interaction received: ${interaction.commandName}`);
    if(interaction.commandName === 'lfm') await processInteractionResponse(interaction as ChatInputCommandInteraction);
  }
  if(interaction.isModalSubmit()){
    const groupId = interaction.customId.match(/\[(.*?)\]/)?.[1];
    const model = await GroupModel.findOne({groupId});
    const groupMessage = await processModalSubmit(interaction);
    await model?.updateOne({messageId: groupMessage?.id});
    // TODO: Add embed to the message and update the model with the embed id
    // TODO: create thread and add threadId to model
  }

});

client.login(process.env.DISCORD_BOT_TOKEN!);
