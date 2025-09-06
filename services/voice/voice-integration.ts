import { VoiceChannel, GuildMember, VoiceState, PermissionsBitField } from 'discord.js';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';

interface IVoiceChannelConfig {
	channelId: string;
	guildId: string;
	groupId?: string;
	isTemporary: boolean;
	maxUsers: number;
	permissions: {
		canSpeak: string[];
		canHear: string[];
		isLocked: boolean;
	};
	autoDeleteAfter?: number; // minutes
	createdAt: Date;
}

interface IVoiceActivity {
	userId: string;
	guildId: string;
	channelId: string;
	joinedAt: Date;
	leftAt?: Date;
	speakTime: number; // seconds
	muteTime: number; // seconds
	deafenTime: number; // seconds
}

export class VoiceIntegrationService {
	private static instance: VoiceIntegrationService;
	private voiceConfigs: Map<string, IVoiceChannelConfig> = new Map();
	private voiceActivities: Map<string, IVoiceActivity> = new Map();
	private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

	private constructor() {}

	static getInstance(): VoiceIntegrationService {
		if (!VoiceIntegrationService.instance) {
			VoiceIntegrationService.instance = new VoiceIntegrationService();
		}
		return VoiceIntegrationService.instance;
	}

	async createGroupVoiceChannel(
		guild: any,
		groupId: string,
		channelName: string,
		maxUsers: number = 5,
		options?: {
			categoryId?: string;
			autoDeleteMinutes?: number;
			isLocked?: boolean;
		}
	): Promise<string | null> {
		try {
			const channelOptions: any = {
				name: channelName,
				type: 2, // Voice channel
				userLimit: maxUsers,
				permissionOverwrites: [
					{
						id: guild.roles.everyone.id,
						deny: [PermissionsBitField.Flags.ViewChannel],
					},
				],
			};

			if (options?.categoryId) {
				channelOptions.parent = options.categoryId;
			}

			const channel = await guild.channels.create(channelOptions);

			const config: IVoiceChannelConfig = {
				channelId: channel.id,
				guildId: guild.id,
				groupId,
				isTemporary: true,
				maxUsers,
				permissions: {
					canSpeak: [],
					canHear: [],
					isLocked: options?.isLocked || false,
				},
				autoDeleteAfter: options?.autoDeleteMinutes || 60,
				createdAt: new Date(),
			};

			this.voiceConfigs.set(channel.id, config);

			if (config.autoDeleteAfter) {
				this.scheduleChannelCleanup(channel.id, config.autoDeleteAfter * 60 * 1000);
			}

			logger(LogLevel.INFO, `Created voice channel ${channel.id} for group ${groupId}`);
			return channel.id;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error creating group voice channel: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	async addUserToVoiceChannel(channelId: string, userId: string, permissions?: {
		canSpeak?: boolean;
		canHear?: boolean;
	}): Promise<boolean> {
		try {
			const voiceConfig = this.voiceConfigs.get(channelId);
			if (!voiceConfig) {
				return false;
			}

			// Get the Discord channel
			const guild = await this.getGuild(voiceConfig.guildId);
			if (!guild) return false;

			const channel = guild.channels.cache.get(channelId);
			if (!channel) return false;

			const member = await guild.members.fetch(userId);
			if (!member) return false;

			const permissionOverwrites: any[] = [
				{
					id: userId,
					allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
				},
			];

			if (permissions?.canSpeak === false) {
				permissionOverwrites[0].deny = [PermissionsBitField.Flags.Speak];
			} else {
				permissionOverwrites[0].allow.push(PermissionsBitField.Flags.Speak);
			}

			if (permissions?.canHear === false) {
				permissionOverwrites[0].deny = permissionOverwrites[0].deny || [];
				permissionOverwrites[0].deny.push(PermissionsBitField.Flags.Stream);
			}

			await channel.permissionOverwrites.create(userId, 
				Object.fromEntries(
					permissionOverwrites[0].allow?.map((p: any) => [p, true]) || []
				)
			);

			if (permissions?.canSpeak !== false) {
				voiceConfig.permissions.canSpeak.push(userId);
			}
			if (permissions?.canHear !== false) {
				voiceConfig.permissions.canHear.push(userId);
			}

			this.voiceConfigs.set(channelId, voiceConfig);
			logger(LogLevel.INFO, `Added user ${userId} to voice channel ${channelId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error adding user to voice channel: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async removeUserFromVoiceChannel(channelId: string, userId: string): Promise<boolean> {
		try {
			const voiceConfig = this.voiceConfigs.get(channelId);
			if (!voiceConfig) {
				return false;
			}

			const guild = await this.getGuild(voiceConfig.guildId);
			if (!guild) return false;

			const channel = guild.channels.cache.get(channelId);
			if (!channel) return false;

			const member = await guild.members.fetch(userId);
			if (member && member.voice.channelId === channelId) {
				await member.voice.disconnect('Removed from group voice channel');
			}

			await channel.permissionOverwrites.delete(userId);

			voiceConfig.permissions.canSpeak = voiceConfig.permissions.canSpeak.filter(id => id !== userId);
			voiceConfig.permissions.canHear = voiceConfig.permissions.canHear.filter(id => id !== userId);

			this.voiceConfigs.set(channelId, voiceConfig);
			logger(LogLevel.INFO, `Removed user ${userId} from voice channel ${channelId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error removing user from voice channel: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async deleteVoiceChannel(channelId: string): Promise<boolean> {
		try {
			const voiceConfig = this.voiceConfigs.get(channelId);
			if (!voiceConfig) {
				return false;
			}

			const guild = await this.getGuild(voiceConfig.guildId);
			if (!guild) return false;

			const channel = guild.channels.cache.get(channelId);
			if (channel) {
				await channel.delete('Group voice channel cleanup');
			}

			this.voiceConfigs.delete(channelId);
			
			const timer = this.cleanupTimers.get(channelId);
			if (timer) {
				clearTimeout(timer);
				this.cleanupTimers.delete(channelId);
			}

			logger(LogLevel.INFO, `Deleted voice channel ${channelId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error deleting voice channel: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		try {
			const userId = newState.id;
			const guildId = newState.guild.id;

			// User joined a voice channel
			if (!oldState.channelId && newState.channelId) {
				await this.trackVoiceJoin(userId, guildId, newState.channelId);
			}

			// User left a voice channel
			if (oldState.channelId && !newState.channelId) {
				await this.trackVoiceLeave(userId, guildId, oldState.channelId);
				await this.checkChannelEmpty(oldState.channelId);
			}

			// User switched channels
			if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
				await this.trackVoiceLeave(userId, guildId, oldState.channelId);
				await this.trackVoiceJoin(userId, guildId, newState.channelId);
				await this.checkChannelEmpty(oldState.channelId);
			}

			// Track mute/unmute
			if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
				await this.trackMuteChange(userId, newState.channelId, Boolean(newState.selfMute || newState.serverMute));
			}

			// Track deaf/undeaf
			if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
				await this.trackDeafenChange(userId, newState.channelId, Boolean(newState.selfDeaf || newState.serverDeaf));
			}
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error handling voice state update: ${config.sanitizeForLogging(error)}`);
		}
	}

	private async trackVoiceJoin(userId: string, guildId: string, channelId: string): Promise<void> {
		const activityKey = `${userId}_${channelId}`;
		const activity: IVoiceActivity = {
			userId,
			guildId,
			channelId,
			joinedAt: new Date(),
			speakTime: 0,
			muteTime: 0,
			deafenTime: 0,
		};

		this.voiceActivities.set(activityKey, activity);
		logger(LogLevel.DEBUG, `User ${userId} joined voice channel ${channelId}`);
	}

	private async trackVoiceLeave(userId: string, guildId: string, channelId: string): Promise<void> {
		const activityKey = `${userId}_${channelId}`;
		const activity = this.voiceActivities.get(activityKey);
		
		if (activity) {
			activity.leftAt = new Date();
			logger(LogLevel.DEBUG, `User ${userId} left voice channel ${channelId} after ${this.calculateDuration(activity.joinedAt, activity.leftAt)} minutes`);
		}
	}

	private async trackMuteChange(userId: string, channelId: string | null, isMuted: boolean): Promise<void> {
		if (!channelId) return;

		const activityKey = `${userId}_${channelId}`;
		const activity = this.voiceActivities.get(activityKey);
		
		if (activity) {
			// This is a simplified tracking - in a real implementation you'd track time periods
			if (isMuted) {
				activity.muteTime += 1;
			}
		}
	}

	private async trackDeafenChange(userId: string, channelId: string | null, isDeafened: boolean): Promise<void> {
		if (!channelId) return;

		const activityKey = `${userId}_${channelId}`;
		const activity = this.voiceActivities.get(activityKey);
		
		if (activity) {
			if (isDeafened) {
				activity.deafenTime += 1;
			}
		}
	}

	private async checkChannelEmpty(channelId: string): Promise<void> {
		const voiceConfig = this.voiceConfigs.get(channelId);
		if (!voiceConfig || !voiceConfig.isTemporary) {
			return;
		}

		const guild = await this.getGuild(voiceConfig.guildId);
		if (!guild) return;

		const channel = guild.channels.cache.get(channelId) as VoiceChannel;
		if (channel && channel.members.size === 0) {
			// Schedule cleanup after 5 minutes of being empty
			this.scheduleChannelCleanup(channelId, 5 * 60 * 1000);
		}
	}

	private scheduleChannelCleanup(channelId: string, delayMs: number): void {
		const existingTimer = this.cleanupTimers.get(channelId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const timer = setTimeout(async () => {
			await this.deleteVoiceChannel(channelId);
		}, delayMs);

		this.cleanupTimers.set(channelId, timer);
	}

	private calculateDuration(start: Date, end: Date): number {
		return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
	}

	private async getGuild(guildId: string): Promise<any> {
		// In a real implementation, this would get the guild from the Discord client
		// For now, returning null as we don't have access to the client instance
		return null;
	}

	getVoiceChannelConfig(channelId: string): IVoiceChannelConfig | null {
		return this.voiceConfigs.get(channelId) || null;
	}

	getVoiceActivity(userId: string, channelId: string): IVoiceActivity | null {
		const activityKey = `${userId}_${channelId}`;
		return this.voiceActivities.get(activityKey) || null;
	}

	getUserVoiceActivities(userId: string): IVoiceActivity[] {
		return Array.from(this.voiceActivities.values()).filter(activity => 
			activity.userId === userId
		);
	}

	async lockVoiceChannel(channelId: string): Promise<boolean> {
		try {
			const voiceConfig = this.voiceConfigs.get(channelId);
			if (!voiceConfig) {
				return false;
			}

			const guild = await this.getGuild(voiceConfig.guildId);
			if (!guild) return false;

			const channel = guild.channels.cache.get(channelId);
			if (!channel) return false;

			await channel.permissionOverwrites.edit(guild.roles.everyone, {
				Connect: false as any,
			});

			voiceConfig.permissions.isLocked = true;
			this.voiceConfigs.set(channelId, voiceConfig);

			logger(LogLevel.INFO, `Locked voice channel ${channelId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error locking voice channel: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}

	async unlockVoiceChannel(channelId: string): Promise<boolean> {
		try {
			const voiceConfig = this.voiceConfigs.get(channelId);
			if (!voiceConfig) {
				return false;
			}

			const guild = await this.getGuild(voiceConfig.guildId);
			if (!guild) return false;

			const channel = guild.channels.cache.get(channelId);
			if (!channel) return false;

			await channel.permissionOverwrites.edit(guild.roles.everyone, {
				Connect: null as any, // Remove the deny
			});

			voiceConfig.permissions.isLocked = false;
			this.voiceConfigs.set(channelId, voiceConfig);

			logger(LogLevel.INFO, `Unlocked voice channel ${channelId}`);
			return true;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error unlocking voice channel: ${config.sanitizeForLogging(error)}`);
			return false;
		}
	}
}