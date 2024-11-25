import { Client } from 'discord.js';

export const getThreadByMessageId = async (client: Client, threadId: string) => {
	try {
		const channel = await client.channels.fetch(threadId);
		console.log('Channel:', channel);
		if (channel && channel.isThread()) {
			return channel;
		}
		else {
			throw new Error(`Channel with id ${threadId} is not a thread`);
		}
	}
	catch (error) {
		console.error(`Error fetching thread with id ${threadId}:`, error);
	}
};