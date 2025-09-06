import { REST, Routes, PermissionFlagsBits } from 'discord.js';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { createDynamicLfmCommand } from '../../utils/commands/dynamic-lfm-command';
import { SlashCommandBuilder } from 'discord.js';
import { MemberRole } from '../../enums';
import { GroupFilterService } from '../filter/group-filter-service';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

export const registerCommands = async () => {
	try {
		// Create dynamic commands
		const dynamicLfmCommand = await createDynamicLfmCommand();

		const commands = [
			dynamicLfmCommand, // Dynamic LFM command with current season dungeons
			new SlashCommandBuilder()
				.setName('help')
				.setDescription('Show help information for all available commands')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('join')
				.setDescription('Join a group with a specific role')
				.addStringOption(option =>
					option.setName('group_id')
						.setDescription('The ID of the group to join')
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('role')
						.setDescription('The role you want to join as')
						.setRequired(true)
						.addChoices(
							...Object.values(MemberRole)
								.filter(role => role !== MemberRole.None)
								.map(role => ({
									name: role,
									value: role,
								})),
						),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('leave')
				.setDescription('Leave a group by clearing your role')
				.addStringOption(option =>
					option.setName('group_id')
						.setDescription('The ID of the group to leave')
						.setRequired(true),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('groups')
				.setDescription('List all active groups with open slots')
				.addStringOption(option =>
					option.setName('level_range')
						.setDescription('Filter by dungeon level range')
						.setRequired(false)
						.addChoices(
							...GroupFilterService.getLevelRangeChoices(),
							{ name: 'Custom Range', value: 'custom:' }
						)
				)
				.addStringOption(option =>
					option.setName('custom_level_range')
						.setDescription('Custom level range (format: min-max, e.g., 3-7)')
						.setRequired(false)
				)
				.addStringOption(option =>
					option.setName('dungeon')
						.setDescription('Filter by dungeon name (partial match)')
						.setRequired(false)
				)
				.addStringOption(option =>
					option.setName('role')
						.setDescription('Filter by available role slots')
						.setRequired(false)
						.addChoices(...GroupFilterService.getRoleChoices())
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('mygroups')
				.setDescription('Show groups you are currently participating in')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('refresh-dungeons')
				.setDescription('Fetch current season dungeons from Battle.net API')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('set-battletag')
				.setDescription('Set your Battle.net BattleTag')
				.addStringOption(option =>
					option.setName('battletag')
						.setDescription('Your BattleTag (format: Name#1234)')
						.setRequired(true),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('set-main')
				.setDescription('Set your main character for Raider.IO integration')
				.addStringOption(option =>
					option.setName('character')
						.setDescription('Your main character name')
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('realm')
						.setDescription('Your character\'s realm')
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('region')
						.setDescription('Your character\'s region')
						.setRequired(false)
						.addChoices(
							{ name: 'US', value: 'us' },
							{ name: 'EU', value: 'eu' },
							{ name: 'KR', value: 'kr' },
							{ name: 'TW', value: 'tw' },
						),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('profile')
				.setDescription('View your profile with Raider.IO data')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('refresh-profile')
				.setDescription('Refresh your Raider.IO data')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('set-lfm-channel')
				.setDescription('Set the LFM channel for this guild')
				.addChannelOption(option =>
					option.setName('channel')
						.setDescription('The channel to use for LFG posts')
						.setRequired(true),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('link-guild')
				.setDescription('Link this guild with another Discord server for cross-posting')
				.addStringOption(option =>
					option.setName('guild_id')
						.setDescription('The Discord server ID to link with')
						.setRequired(true),
				)
				.addStringOption(option =>
					option.setName('guild_name')
						.setDescription('The name of the Discord server')
						.setRequired(true),
				)
				.addBooleanOption(option =>
					option.setName('include_voice_channels')
						.setDescription('Include voice channel links in cross-posts')
						.setRequired(false),
				)
				.addBooleanOption(option =>
					option.setName('include_raid_progress')
						.setDescription('Include raid progress in cross-posts')
						.setRequired(false),
				)
				.addBooleanOption(option =>
					option.setName('include_mythic_plus_score')
						.setDescription('Include M+ scores in cross-posts')
						.setRequired(false),
				)
				.addStringOption(option =>
					option.setName('custom_message')
						.setDescription('Custom message to include with cross-posts')
						.setRequired(false),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('unlink-guild')
				.setDescription('Unlink this guild from another Discord server')
				.addStringOption(option =>
					option.setName('guild_id')
						.setDescription('The Discord server ID to unlink from')
						.setRequired(true),
				)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('guild-config')
				.setDescription('View this guild\'s configuration and linked servers')
				.toJSON(),
			new SlashCommandBuilder()
				.setName('cleanup')
				.setDescription('🧹 Admin only: Delete all bot messages, threads, and embeds in this channel')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('set-fallback')
				.setDescription('🔄 Admin only: Set Aliwicious (Illidan-US) as fallback character for Raider.IO data')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('refresh-season')
				.setDescription('📅 Admin only: Refresh current season data from Raider.IO API')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.toJSON(),
			new SlashCommandBuilder()
				.setName('tts-status')
				.setDescription('🎤 Show TTS queue status and active connections')
				.toJSON(),
		];

		// Use guild commands for development (instant), global commands for production
		const isProduction = process.env.NODE_ENV === 'production';
		const guildId = process.env.DEV_GUILD_ID;

		if (!isProduction && guildId) {
			logger(LogLevel.INFO, `Started refreshing guild (/) commands for guild ${guildId}.`);
			await rest.put(
				Routes.applicationGuildCommands(process.env.DISCORD_BOT_APP_ID!, guildId),
				{ body: commands },
			);
			logger(LogLevel.INFO, `Successfully reloaded guild (/) commands for guild ${guildId}.`);
		}
		else {
			logger(LogLevel.INFO, 'Started refreshing application (/) commands globally.');
			await rest.put(
				Routes.applicationCommands(process.env.DISCORD_BOT_APP_ID!),
				{ body: commands },
			);
			logger(LogLevel.INFO, 'Successfully reloaded application (/) commands globally.');
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `${JSON.stringify(error)}`);
	}
};