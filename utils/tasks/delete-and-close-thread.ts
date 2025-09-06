import { getMessageByMessageId, getThreadByMessageId } from '../messages';
import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';
import { LogLevel } from '../../enums';
import { logger } from '../logger';
import { createGroupVoiceChannel } from '../../services/voice/create-voice-channel';

/**
 * Archives and deletes threads and embeds for groups that are older than 24 hours.
 * Also creates voice channels for groups that are starting.
 */
export const archiveAndDeleteThreadAndEmbed = async (client: Client) => {
	const groups = await GroupModel.find({ archived: { $ne: true } });
	logger(LogLevel.INFO, `🔍 Processing ${groups.length} active groups for reminders and cleanup`);

	for (const group of groups) {
		logger(LogLevel.DEBUG, `Processing group: ${group.groupId}`);

		if (group.startTime) {
			const now = Date.now();
			const start = group.startTime.getTime();
			const timeUntilStart = Math.round((start - now) / 1000 / 60); // minutes
			logger(LogLevel.DEBUG, `Group ${group.groupId} starts in ${timeUntilStart} minutes`);
		}

		// Check if group needs voice channel (5 minutes before start)
		if (group.startTime && isGroupNeedsVoiceChannel(group.startTime) && !group.voiceChannelId) {
			logger(LogLevel.INFO, `🎤 Group ${group.groupId} needs voice channel - creating 5 minutes before start`);
			await createGroupVoiceChannel(client, group.groupId);
		}

		// Check if group is starting soon for warning message (5 minutes before)
		if (group.startTime && isGroupWarningTime(group.startTime) && !group.warningMessageSent) {
			logger(LogLevel.INFO, `⏰ Group ${group.groupId} is starting in 5 minutes - sending warning`);
			await sendGroupWarningMessage(client, group.groupId);
		}

		if (isMoreThan24Hours(group.startTime ?? new Date())) {
			logger(LogLevel.INFO, `Group ${group.groupId} is older than 24 hours`);

			const thread = await getThreadByMessageId(client, group.threadId ?? '');
			const embed = await getMessageByMessageId(client, group.embedId ?? '', group.guildId ?? '', group.channelId ?? '');

			// Delete voice channel if it exists
			if (group.voiceChannelId) {
				try {
					const guild = await client.guilds.fetch(group.guildId ?? '');
					const voiceChannel = await guild?.channels.fetch(group.voiceChannelId);
					if (voiceChannel) {
						logger(LogLevel.INFO, `Deleting voice channel: ${group.voiceChannelId}`);
						await voiceChannel.delete();
						logger(LogLevel.INFO, `Deleted voice channel: ${group.voiceChannelId}`);
					}
				}
				catch (error) {
					logger(LogLevel.ERROR, `Failed to delete voice channel: ${group.voiceChannelId}: ${JSON.stringify(error)}`);
				}
			}

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
	const group = await GroupModel.findOne({ groupId: groupId });

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

	// Delete voice channel if it exists
	if (group.voiceChannelId) {
		try {
			const guild = await client.guilds.fetch(group.guildId ?? '');
			const voiceChannel = await guild?.channels.fetch(group.voiceChannelId);
			if (voiceChannel) {
				logger(LogLevel.INFO, `Deleting voice channel: ${group.voiceChannelId}`);
				await voiceChannel.delete();
				logger(LogLevel.INFO, `Deleted voice channel: ${group.voiceChannelId}`);
			}
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to delete voice channel: ${group.voiceChannelId}: ${JSON.stringify(error)}`);
		}
	}

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

	await GroupModel.updateOne({ groupId: group.groupId, threadId: group.threadId }, { archived: true });
};

/**
 * Checks if a timestamp is older than 24 hours.
 */
export const isMoreThan24Hours = (timestamp: Date): boolean => {
	const timeDifference = Date.now() - timestamp.getTime();
	return timeDifference > 24 * 60 * 60 * 1000;
};

/**
 * Checks if a group needs voice channel (5 minutes before start time).
 */
export const isGroupNeedsVoiceChannel = (startTime: Date): boolean => {
	const now = Date.now();
	const start = startTime.getTime();
	const fiveMinutes = 5 * 60 * 1000;

	// Create voice channel 5 minutes before start time
	return now >= (start - fiveMinutes) && now <= start;
};

/**
 * Checks if it's time to send warning message (exactly 5 minutes before start).
 */
export const isGroupWarningTime = (startTime: Date): boolean => {
	const now = Date.now();
	const start = startTime.getTime();
	const fiveMinutes = 5 * 60 * 1000;
	const twoMinutes = 2 * 60 * 1000; // 2 minute window to account for interval timing

	// Send warning between 5-3 minutes before start (2 minute window)
	const warningTime = start - fiveMinutes;
	return now >= warningTime && now <= (warningTime + twoMinutes);
};

/**
 * Sends warning message to group members with voice channel link
 */
async function sendGroupWarningMessage(client: Client, groupId: string) {
	try {
		const group = await GroupModel.findOne({ groupId });
		if (!group) return;

		if (!group.members || group.members.length === 0) return;

		let message = `⏰ **${group.groupName}** starts in 5 minutes!\n\n`;

		if (group.voiceChannelId) {
			message += `🎮 Join the voice channel: <#${group.voiceChannelId}>`;
		}
		else {
			message += '🎮 Voice channel will be created at start time.';
		}
		
		// Add group embed link if available
		if (group.embedId && group.channelId && group.guildId) {
			message += `\n\n📋 [View Group Details](https://discord.com/channels/${group.guildId}/${group.channelId}/${group.embedId})`;
		}

		// Send DM to all group members
		for (const member of group.members) {
			if (member.userId) {
				try {
					const user = await client.users.fetch(member.userId);
					await user.send(message);
					logger(LogLevel.DEBUG, `Sent warning to user ${member.userId}`);
				}
				catch (error) {
					logger(LogLevel.WARN, `Failed to send warning to user ${member.userId}: ${(error as Error).message}`);
				}
			}
		}

		// Mark warning as sent
		await GroupModel.updateOne({ groupId }, { warningMessageSent: true });

	}
	catch (error) {
		logger(LogLevel.ERROR, `Failed to send warning message for group ${groupId}: ${(error as Error).message}`);
	}
}
