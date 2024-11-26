import { Client } from 'discord.js';
import { LogLevel } from '../../enums';
import { logger } from '../logger';

/**
 * Fetches a thread by its message ID.
 *
 * @param client - The Discord client instance.
 * @param threadId - The ID of the thread to fetch.
 * @returns The fetched thread if it exists and is a thread, otherwise throws an error.
 * @throws Will throw an error if the channel with the given ID is not a thread or if there is an error fetching the thread.
 */
export const getThreadByMessageId = async (client: Client, threadId: string) => {
	try {
		const channel = await client.channels.fetch(threadId);
		logger(LogLevel.INFO, 'Channel: ${channel}');
		if (channel && channel.isThread()) {
			return channel;
		}
		else {
			throw new Error(`Channel with id ${threadId} is not a thread`);
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error fetching thread with id ${threadId}: ${error}`);
	}
};