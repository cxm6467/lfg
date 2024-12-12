import { getMessageByMessageId, getThreadByMessageId } from '../messages';
import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';
import { LogLevel } from '../../enums';
import { logger } from '../logger';

/**
 * Archives and deletes threads and embeds for groups that are older than 24 hours.
 */
export const archiveAndDeleteThreadAndEmbed = async (client: Client) => {
	const groups = await GroupModel.find({ archived: { $ne: true } });
	logger(LogLevel.INFO, `Found ${groups.length} groups`);

	for (const group of groups) {
		logger(LogLevel.INFO, `Processing group: ${group.groupId}`);

		if (isMoreThan24Hours(group.startTime ?? new Date())) {
			logger(LogLevel.INFO, `Group ${group.groupId} is older than 24 hours`);

			const thread = await getThreadByMessageId(client, group.threadId ?? '');
			const embed = await getMessageByMessageId(client, group.embedId ?? '', group.guildId ?? '', group.channelId ?? '');

			if (thread) {
				try {
					logger(LogLevel.INFO, `Deleting thread: ${group.threadId}`);
					await thread.delete();
					logger(LogLevel.INFO, `Deleted thread: ${group.threadId}`);
				}
				catch (error) {
					logger(LogLevel.ERROR, `Failed to delete thread: ${group.threadId}: ${JSON.stringify(error)}`);
				}
			}
			else {
				logger(LogLevel.WARN, `Thread not found: ${group.threadId}`);
			}

			if (embed) {
				try {
					logger(LogLevel.INFO, `Deleting embed: ${group.embedId}`);
					await embed.delete();
					logger(LogLevel.INFO, `Deleted embed: ${group.embedId}`);
				}
				catch (error) {
					logger(LogLevel.ERROR, `Failed to delete embed: ${group.embedId}: ${JSON.stringify(error)}`);
				}
			}
			else {
				logger(LogLevel.WARN, `Embed not found: ${group.embedId}`);
			}

			await GroupModel.updateOne({ groupId: group.groupId }, { archived: true });
		}
		else {
			logger(LogLevel.INFO, `Group ${group.groupId} is not older than 24 hours`);
		}
	}
};

/**
 * Deletes thread and embed if triggered by a group member.
 */
export const finishGroup = async (client: Client, groupId: string, userId: string) => {
	const group = await GroupModel.findOne({ _id: groupId });

	if (!group) {
		logger(LogLevel.WARN, `Group with ID ${groupId} not found`);
		return;
	}

	if (!group?.members?.some(m => m.userId === userId)) {
		logger(LogLevel.WARN, `User ${userId} is not a member of group ${groupId}`);
		try {
			const user = await client.users.fetch(userId);
			await user.send('You are not authorized to finish this group.');
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to notify user ${userId}: ${JSON.stringify(error)}`);
		}
		return;
	}

	logger(LogLevel.INFO, `User ${userId} authorized to finish group ${groupId}`);

	const thread = await getThreadByMessageId(client, group.threadId ?? '');
	const embed = await getMessageByMessageId(client, group.embedId ?? '', group.guildId ?? '', group.channelId ?? '');

	if (thread) {
		try {
			logger(LogLevel.INFO, `Deleting thread: ${group.threadId}`);
			await thread.delete();
			logger(LogLevel.INFO, `Deleted thread: ${group.threadId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to delete thread: ${group.threadId}: ${JSON.stringify(error)}`);
		}
	}
	else {
		logger(LogLevel.WARN, `Thread not found: ${group.threadId}`);
	}

	if (embed) {
		try {
			logger(LogLevel.INFO, `Deleting embed: ${group.embedId}`);
			await embed.delete();
			logger(LogLevel.INFO, `Deleted embed: ${group.embedId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to delete embed: ${group.embedId}: ${JSON.stringify(error)}`);
		}
	}
	else {
		logger(LogLevel.WARN, `Embed not found: ${group.embedId}`);
	}

	await GroupModel.updateOne({ groupId: group.groupId }, { archived: true });
};

/**
 * Checks if a timestamp is older than 24 hours.
 */
export const isMoreThan24Hours = (timestamp: Date): boolean => {
	const timeDifference = Date.now() - timestamp.getTime();
	return timeDifference > 24 * 60 * 60 * 1000;
};
