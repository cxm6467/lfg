import { Client } from 'discord.js';
import { IGroup } from '../../interfaces';
import { getMessageByMessageId } from './get-message-by-message-id';
import { logger } from '../logger';
import { LogLevel } from '../../enums';


/**
 * Reacts to a message in a specified group with a thumbs up emoji.
 *
 * @param client - The Discord client instance.
 * @param group - The group object containing messageId, guildId, and channelId.
 * @returns A promise that resolves when the reaction is added.
 *
 * @throws Will log an error if there is an issue reacting to the message.
 */
export const reactToMessage = async (client: Client, group: IGroup) => {
	try {
		if (group.messageId && group.guildId && group.channelId) {
			const message = await getMessageByMessageId(client, group.messageId, group.guildId, group.channelId);
			await message?.react('👍');
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error reacting to message in guild ${group.guildId}: ${JSON.stringify(error)}`);
	}
};
