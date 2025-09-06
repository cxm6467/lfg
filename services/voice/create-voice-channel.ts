import { Client, ChannelType, PermissionFlagsBits, VoiceChannel, Guild } from 'discord.js';
import { GroupModel } from '../../models/group';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { TTSQueueService } from '../tts/tts-queue-service';

/**
 * Creates a private voice channel for group members at start time
 */
export const createGroupVoiceChannel = async (client: Client, groupId: string): Promise<VoiceChannel | null> => {
	try {
		logger(LogLevel.INFO, `Attempting to create voice channel for group ${groupId}`);

		const group = await GroupModel.findOne({ groupId });
		if (!group) {
			logger(LogLevel.ERROR, `Group ${groupId} not found`);
			return null;
		}

		if (!group.guildId) {
			logger(LogLevel.ERROR, `No guild ID for group ${groupId}`);
			return null;
		}

		logger(LogLevel.DEBUG, `Group ${groupId} has ${group.members?.length || 0} members`);

		const guild = await client.guilds.fetch(group.guildId);
		if (!guild) {
			logger(LogLevel.ERROR, `Guild ${group.guildId} not found`);
			return null;
		}

		// Create permission overwrites for group members
		const permissionOverwrites: any[] = [
			{
				id: guild.id, // @everyone role
				deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
			},
		];

		// Add permissions for each group member
		if (group.members) {
			for (const member of group.members) {
				if (member.userId) {
					permissionOverwrites.push({
						id: member.userId,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.Connect,
							PermissionFlagsBits.Speak,
							PermissionFlagsBits.UseVAD,
						],
					});
				}
			}
		}

		// Check if bot has required permissions
		const botMember = await guild.members.fetch(client.user!.id);
		const requiredPermissions = [
			PermissionFlagsBits.ManageChannels,
			PermissionFlagsBits.MoveMembers,
			PermissionFlagsBits.Connect,
			PermissionFlagsBits.Speak
		];
		
		const missingPermissions = requiredPermissions.filter(permission => 
			!botMember.permissions.has(permission)
		);
		
		if (missingPermissions.length > 0) {
			logger(LogLevel.ERROR, `Bot missing required permissions in guild ${group.guildId}: ${missingPermissions.join(', ')}`);
			return null;
		}

		// Create the voice channel
		const voiceChannel = await guild.channels.create({
			name: `🎮 ${group.groupName}`,
			type: ChannelType.GuildVoice,
			permissionOverwrites,
			reason: `Auto-created for group ${group.groupName}`,
		});

		// Update the group with voice channel ID
		await GroupModel.updateOne(
			{ groupId },
			{ voiceChannelId: voiceChannel.id },
		);

		logger(LogLevel.INFO, `Created voice channel ${voiceChannel.id} for group ${groupId}`);

		// Move users to voice channel and send notifications
		await moveUsersToVoiceChannel(client, group, voiceChannel);
		await notifyGroupMembers(client, group, voiceChannel);

		// Link voice channel in the group's thread
		await linkVoiceChannelInThread(client, group, voiceChannel);

		// Queue TTS countdown with 30-second delay
		await queueTTSCountdown(voiceChannel, group);

		return voiceChannel;

	}
	catch (error) {
		const errorMessage = (error as Error).message;
		logger(LogLevel.ERROR, `Failed to create voice channel for group ${groupId}: ${errorMessage}`);
		
		// Log specific permission errors for easier debugging
		if (errorMessage.includes('Missing Permissions')) {
			logger(LogLevel.ERROR, `Bot needs 'Manage Channels' permission to create voice channels`);
		} else if (errorMessage.includes('Missing Access')) {
			logger(LogLevel.ERROR, `Bot needs access to the channel category or parent channel`);
		}
		
		return null;
	}
};

/**
 * Queue TTS countdown for a group
 */
async function queueTTSCountdown(voiceChannel: VoiceChannel, group: any): Promise<void> {
	try {
		logger(LogLevel.INFO, `🎤 Queuing TTS countdown for group ${group.groupName} in voice channel ${voiceChannel.id}`);

		// TTS countdown messages
		const countdownMessages = [
			`${group.groupName} voice channel is now open! Starting countdown in 10 seconds.`,
			`${group.groupName} - 10 seconds until start!`,
			`${group.groupName} - 9 seconds until start!`,
			`${group.groupName} - 8 seconds until start!`,
			`${group.groupName} - 7 seconds until start!`,
			`${group.groupName} - 6 seconds until start!`,
			`${group.groupName} - 5 seconds until start!`,
			`${group.groupName} - 4 seconds until start!`,
			`${group.groupName} - 3 seconds until start!`,
			`${group.groupName} - 2 seconds until start!`,
			`${group.groupName} - 1 second until start!`,
			`${group.groupName} - let's fuck!`
		];

		// Add TTS job to queue with 30-second delay
		const ttsQueue = TTSQueueService.getInstance();
		await ttsQueue.addTTSJob(
			voiceChannel,
			countdownMessages,
			group.groupName,
			2 // High priority for countdowns
		);

		// TTS is now limited to voice channels only - no text channel backup messages
		// This ensures TTS announcements stay within the voice channel context

		logger(LogLevel.INFO, `✅ TTS countdown queued for ${group.groupName}`);

	} catch (error) {
		logger(LogLevel.ERROR, `Failed to queue TTS countdown: ${(error as Error).message}`);
	}
}

/**
 * Move group members to the voice channel
 */
async function moveUsersToVoiceChannel(client: Client, group: any, voiceChannel: VoiceChannel) {
	if (!group.members || group.members.length === 0) return;

	logger(LogLevel.INFO, `🎮 Moving ${group.members.length} users to voice channel ${voiceChannel.id}`);

	for (const member of group.members) {
		if (member.userId) {
			try {
				const guildMember = await voiceChannel.guild.members.fetch(member.userId);
				
				// Check if user is in a voice channel
				if (guildMember.voice.channelId) {
					logger(LogLevel.DEBUG, `User ${member.userId} is in voice channel ${guildMember.voice.channelId}, moving to new channel`);
					
					// Move user to the group's voice channel
					await guildMember.voice.setChannel(voiceChannel.id);
					logger(LogLevel.DEBUG, `✅ Moved user ${member.userId} to voice channel ${voiceChannel.id}`);
				} else {
					logger(LogLevel.DEBUG, `User ${member.userId} is not in a voice channel - cannot move them`);
					// Send a DM to encourage them to join
					try {
						const user = await voiceChannel.client.users.fetch(member.userId);
						await user.send(`🎮 **${group.groupName}** voice channel is ready! Please join: <#${voiceChannel.id}>`);
					} catch (dmError) {
						logger(LogLevel.WARN, `Failed to send DM to user ${member.userId}: ${(dmError as Error).message}`);
					}
				}
				
			} catch (error) {
				logger(LogLevel.WARN, `⚠️ Failed to move user ${member.userId} to voice channel: ${(error as Error).message}`);
			}
		}
	}
}

/**
 * Notify group members about the voice channel
 */
async function notifyGroupMembers(client: Client, group: any, voiceChannel: VoiceChannel) {
	if (!group.members || group.members.length === 0) return;

	const channelMention = `<#${voiceChannel.id}>`;
	let message = `🎮 **${group.groupName}** is starting!\n\nJoin the voice channel: ${channelMention}`;
	
	// Add group embed link if available
	if (group.embedId && group.channelId && group.guildId) {
		message += `\n\n📋 [View Group Details](https://discord.com/channels/${group.guildId}/${group.channelId}/${group.embedId})`;
	}

	for (const member of group.members) {
		if (member.userId) {
			try {
				const user = await client.users.fetch(member.userId);
				await user.send(message);
				logger(LogLevel.DEBUG, `Notified user ${member.userId} about voice channel`);
			}
			catch (error) {
				logger(LogLevel.WARN, `Failed to notify user ${member.userId}: ${(error as Error).message}`);
			}
		}
	}
}

/**
 * Link the voice channel in the group's thread
 */
async function linkVoiceChannelInThread(client: Client, group: any, voiceChannel: VoiceChannel) {
	try {
		if (!group.threadId || !group.guildId) {
			logger(LogLevel.WARN, `No thread ID or guild ID for group ${group.groupId}, cannot link voice channel`);
			return;
		}

		// Get the guild and thread
		const guild = await client.guilds.fetch(group.guildId);
		if (!guild) {
			logger(LogLevel.ERROR, `Guild ${group.guildId} not found`);
			return;
		}

		const thread = await guild.channels.fetch(group.threadId);
		if (!thread || !thread.isThread()) {
			logger(LogLevel.WARN, `Thread ${group.threadId} not found or not a thread`);
			return;
		}

		// Create voice channel link message
		const voiceChannelMention = `<#${voiceChannel.id}>`;
		const message = `🎤 **Voice Channel Created!**\n\nJoin the voice channel: ${voiceChannelMention}\n\n*TTS countdown will begin in 30 seconds!*`;

		// Send message in thread
		await thread.send(message);
		logger(LogLevel.INFO, `✅ Linked voice channel ${voiceChannel.id} in thread ${group.threadId}`);

	} catch (error) {
		logger(LogLevel.ERROR, `Failed to link voice channel in thread: ${(error as Error).message}`);
	}
}
