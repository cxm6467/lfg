import { Client, TextChannel, NewsChannel, ThreadChannel, PermissionsBitField } from "discord.js";
import { IGroup } from "../interfaces";

export const reactToMessage = async (client: Client, group: IGroup) => {
  try {
    if (!client.user) {
      console.log('Bot user is not available yet. Make sure this function is called after the ready event.');
      return;
    }

    const guild = await client.guilds.fetch(group.guildId ?? '');
    if (!guild) {
      console.log(`Guild with ID ${group.guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(group.channelId ?? '');

    // Check if the channel is text-based or a valid thread
    if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel)) {
      console.log(`Channel with ID ${group.channelId} not found or is not a valid text-based channel`);
      return;
    }

    // Ensure the bot has required permissions in the channel
    const permissions = channel.permissionsFor(client.user.id);
    if (!permissions?.has(PermissionsBitField.Flags.ViewChannel) || 
        !permissions?.has(PermissionsBitField.Flags.ReadMessageHistory) || 
        !permissions?.has(PermissionsBitField.Flags.AddReactions)) {
      console.log(`Bot does not have permission to view messages or react in channel ${group.channelId}`);
      return;
    }

    // Use the `around` method to fetch the message
    console.log(`Fetching message around ID ${group.messageId} from channel ${group.channelId} in guild ${group.guildId}`);
    
    const messages = await channel.messages.fetch({
      around: group.messageId,
      limit: 1,
    });
  
    // Get the first message from the collection
    const groupMessage = messages.first();
    if (groupMessage) {
      console.log(`Successfully fetched message with ID ${group.messageId}`);
      await groupMessage.react('👍');     
    } else {
      console.log(`Message with ID ${group.messageId} not found.`);
    }

  } catch (error) {
    console.error(`Error reacting to message in guild ${group.guildId}:`, error);
  }
};
