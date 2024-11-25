import { getMessageByMessageId, getThreadByMessageId } from '../messages';
import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';

export const archiveAndDeleteThreadAndEmbed = async (client: Client) => {
	const groups = await GroupModel.find({ archived: { $ne: true } });
	console.log(`Found ${groups.length} groups`);

	groups.forEach(async (group) => {
		console.log(`Processing group: ${group._id}`);

		if (isMoreThan24Hours(group.startTime ?? new Date())) {
			console.log(`Group ${group._id} is older than 24 hours`);

			const thread = await getThreadByMessageId(client, group.threadId ?? '');
			const embed = await getMessageByMessageId(client, group.embedId ?? '', group.guildId ?? '', group.channelId ?? '');

			if (thread) {
				try {
					console.log(`Attempting to delete thread: ${group.threadId}`);
					await thread.delete();
					console.log(`Deleted thread: ${group.threadId}`);
				}
				catch (error) {
					console.error(`Failed to delete thread: ${group.threadId}`, error);
				}
			}
			else {
				console.log(`Thread not found: ${group.threadId}`);
			}

			if (embed) {
				try {
					console.log(`Attempting to delete embed: ${group.embedId}`);
					await embed.delete();
					console.log(`Deleted embed: ${group.embedId}`);
				}
				catch (error) {
					console.error(`Failed to delete embed: ${group.embedId}`, error);
				}
			}
			else {
				console.log(`Embed not found: ${group.embedId}`);
			}


			await GroupModel.updateOne({ _id: group._id }, { archived: true });
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