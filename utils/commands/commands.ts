import { SlashCommandBuilder } from 'discord.js';
import { DungeonName, DungeonType, MemberRole, RangeChoices } from '../../enums';
import { dynamicLfmCommand } from './dynamic-lfm-command';

/**
 * An array of SlashCommandBuilder objects representing the available commands.
 *
 * - `lfm`: A command for looking for more players.
 *   - Options:
 *     - `difficulty`: The game difficulty you are looking for more players for. Required.
 *     - `dungeon`: The dungeon you are looking for. Required.
 *     - `level`: The level you are looking to complete. Required.
 *     - `role`: The role you are looking to fill. Required.
 *
 * Note: The `lfd` command is currently commented out.
 */
export const commands = [
	dynamicLfmCommand, // Dynamic LFM command with conditional level requirement
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
		.toJSON(),
	new SlashCommandBuilder()
		.setName('mygroups')
		.setDescription('Show groups you are currently participating in')
		.toJSON(),
	new SlashCommandBuilder()
		.setName('refresh-dungeons')
		.setDescription('Fetch current season dungeons from Battle.net API')
		.toJSON(),
	// new SlashCommandBuilder()
	// 	.setName('lfd')
	// 	.setDescription('Looking for deez command')
	// 	.addStringOption(option =>
	// 		option.setName('difficulty')
	// 			.setDescription('The game you are looking for more for')
	// 			.setRequired(true)
	// 			.addChoices(
	// 				...Object.values(DungeonType).map(dungeon => ({
	// 					name: dungeon,
	// 					value: dungeon,
	// 				})),
	// 			),
	// 	)
	// 	.addStringOption(option =>
	// 		option.setName('dungeon')
	// 			.setDescription('The dungeon you are looking for')
	// 			.setRequired(true)
	// 			.addChoices(
	// 				...Object.values(DungeonName).map(dungeon => ({
	// 					name: dungeon,
	// 					value: dungeon,
	// 				})),
	// 			),
	// 	)
	// 	.addStringOption(option =>
	// 		option.setName('level')
	// 			.setDescription('The level you are looking to complete')
	// 			.setRequired(true)
	// 			.addChoices(...RangeChoices),
	// 	)
	// 	.addStringOption(option =>
	// 		option.setName('role')
	// 			.setDescription('The role you are looking to fill')
	// 			.setRequired(true)
	// 			.addChoices(
	// 				...Object.values(MemberRole)
	// 					.filter(role => role !== MemberRole.None)
	// 					.map(role => ({
	// 						name: role,
	// 						value: role,
	// 					})),
	// 			),
	// 	)
	// 	.toJSON(),
];