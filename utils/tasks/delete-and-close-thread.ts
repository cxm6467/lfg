import { getMessageByMessageId, getThreadByMessageId } from '../messages';
import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';

/**
 * Archives and deletes threads and embeds for groups that are older than 24 hours.
 *
 * This function performs the following steps:
 * 1. Retrieves all groups that are not archived.
 * 2. Logs the number of groups found.
 * 3. Iterates over each group and processes it:
 *    - Logs the group ID.
 *    - Checks if the group is older than 24 hours.
 *    - If the group is older than 24 hours:
 *      - Attempts to retrieve and delete the associated thread.
 *      - Logs success or failure of thread deletion.
 *      - Attempts to retrieve and delete the associated embed.
 *      - Logs success or failure of embed deletion.
 *      - Updates the group to mark it as archived.
 *    - If the group is not older than 24 hours, logs that information.
 *
 * @param client - The client instance used to interact with the Discord API.
 * @returns A promise that resolves when the operation is complete.
 */
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

/**
 * Asynchronously finishes a group by deleting its associated thread and embed.
 *
 * @param client - The client instance used to interact with the Discord API.
 * @param groupId - The unique identifier of the group to be finished.
 *
 * @returns A promise that resolves when the group has been finished.
 *
 * @throws Will log an error if the group, thread, or embed cannot be found or deleted.
 */
export const finishGroup = async (client: Client, groupId:string) => {
	const group = await GroupModel.findOne({ groupId });

	if (!group) {console.error(`Group with id ${groupId} not found`);}

	else {
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
	}
};

/**
 * Checks if the given timestamp is more than 24 hours in the past.
 *
 * @param timestamp - The date and time to check.
 * @returns `true` if the timestamp is more than 24 hours in the past, otherwise `false`.
 */
export const isMoreThan24Hours = (timestamp: Date): boolean => {
	const futureDate = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);
	return new Date() > futureDate;
};