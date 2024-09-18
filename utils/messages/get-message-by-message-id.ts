import { Client, TextChannel, NewsChannel, ThreadChannel, PermissionsBitField } from "discord.js";

export const getMessageByMessageId = async (client: Client, messageId: string, guildId: string, channelId: string) => {
  try {
    if (!client.user) {
      console.log('Bot user is not available yet. Make sure this function is called after the ready event.');
      return;
    }

    const guild = await client.guilds.fetch(guildId ?? '');
    if (!guild) {
      console.log(`Guild with ID ${guildId} not found`);
      return;
    }

    const channel = await guild.channels.fetch(channelId ?? '');

    // Check if the channel is text-based or a valid thread
    if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel)) {
      console.log(`Channel with ID ${channelId} not found or is not a valid text-based channel`);
      return;
    }

    // Ensure the bot has required permissions in the channel
    const permissions = channel.permissionsFor(client.user.id);
    if (!permissions?.has(PermissionsBitField.Flags.ViewChannel) || 
        !permissions?.has(PermissionsBitField.Flags.ReadMessageHistory) || 
        !permissions?.has(PermissionsBitField.Flags.AddReactions)) {
      console.log(`Bot does not have permission to view messages or react in channel ${channelId}`);
      return;
    }

    // Use the `around` method to fetch the message
    console.log(`Fetching message ID ${messageId} from channel ${channelId} in guild ${guildId}`);
    
    const messages = await channel.messages.fetch({
      around: messageId,
      limit: 1,
    });
  
    // Get the first message from the collection
    const groupMessage = messages.first();
    if (groupMessage) {
      return groupMessage;
    } else {
      console.log(`Message with ID ${messageId} not found.`);
    }
  } catch (error) {
    console.error('An error occurred while fetching the message:', error);
  }
}