import { getMessageByMessageId, getThreadByMessageId } from '../messages';
import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';

export const deleteAndCloseThread = async (client: Client) => {
	const groups = await GroupModel.find({});
	console.log(`Found ${groups.length} groups`);

	groups.forEach(async (group) => {
		console.log(`Processing group: ${group._id}`);

		if (isMoreThan24Hours(group.startTime ?? new Date())) {
			console.log(`Group ${group._id} is older than 24 hours`);

			const guild = await client.guilds.fetch(group.guildId ?? '');
			const thread = await getThreadByMessageId(client, group.threadId ?? '');
			const embed = await getMessageByMessageId(client, group.embedId ?? '', guild.id, group.channelId ?? '');

			if (thread) {
				await thread.delete();
				console.log(`Deleted thread: ${group.threadId}`);
			}

			if (embed) {
				await embed.delete();
				console.log(`Deleted embed: ${group.embedId}`);
			}
		}
		else {
			console.log(`Group ${group._id} is not older than 24 hours`);
		}
	});
};

export const isMoreThan24Hours = (timestamp: Date): boolean => {
	const futureDate = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);
	return new Date() > futureDate;
};