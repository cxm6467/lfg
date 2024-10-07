import { Client } from 'discord.js';
import { IGroup } from '../../interfaces';
import { getMessageByMessageId } from './get-message-by-message-id';


export const reactToMessage = async (client: Client, group: IGroup) => {
	try {
		if (group.messageId && group.guildId && group.channelId) {
			const message = await getMessageByMessageId(client, group.messageId, group.guildId, group.channelId);
			await message?.react('👍');
		}
	}
	catch (error) {
		console.error(`Error reacting to message in guild ${group.guildId}:`, error);
	}
};
