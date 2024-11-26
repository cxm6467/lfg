import { Client, TextChannel, NewsChannel, ThreadChannel, PermissionsBitField } from 'discord.js';

/**
 * Fetches a message by its ID from a specified channel in a guild.
 *
 * @param client - The Discord client instance.
 * @param messageId - The ID of the message to fetch.
 * @param guildId - The ID of the guild where the message is located.
 * @param channelId - The ID of the channel where the message is located.
 * @returns The fetched message if found, otherwise undefined.
 *
 * @remarks
 * This function requires the bot to have the following permissions in the specified channel:
 * - ViewChannel
 * - ReadMessageHistory
 * - AddReactions
 *
 * Ensure that this function is called after the client's ready event.
 *
 * @throws Will log an error message if the bot user is not available, the guild or channel is not found,
 * or if the bot lacks the necessary permissions.
 */
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

		if (!channel || !(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel)) {
			console.log(`Channel with ID ${channelId} not found or is not a valid text-based channel`);
			return;
		}

		const permissions = channel.permissionsFor(client.user.id);
		if (!permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
        !permissions?.has(PermissionsBitField.Flags.ReadMessageHistory) ||
        !permissions?.has(PermissionsBitField.Flags.AddReactions)) {
			console.log(`Bot does not have permission to view messages or react in channel ${channelId}`);
			return;
		}

		console.log(`Fetching message ID ${messageId} from channel ${channelId} in guild ${guildId}`);

		const messages = await channel.messages.fetch({
			around: messageId,
			limit: 1,
		});

		const groupMessage = messages.first();
		if (groupMessage) {
			return groupMessage;
		}
		else {
			console.log(`Message with ID ${messageId} not found.`);
		}
	}
	catch (error) {
		console.error('An error occurred while fetching the message:', error);
	}
};