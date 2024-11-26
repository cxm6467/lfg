import { SlashCommandBuilder } from 'discord.js';
import { DungeonName, DungeonType, MemberRole, RangeChoices } from '../../enums';

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
	new SlashCommandBuilder()
		.setName('lfm')
		.setDescription('Looking for more command')
		.addStringOption(option =>
			option.setName('difficulty')
				.setDescription('The game you are looking for more for')
				.setRequired(true)
				.addChoices(
					...Object.values(DungeonType).map(type => ({
						name: type,
						value: type,
					})),
				),
		)
		.addStringOption(option =>
			option.setName('dungeon')
				.setDescription('The dungeon you are looking for')
				.setRequired(true)
				.addChoices(
					...Object.values(DungeonName).map(dungeon => ({
						name: dungeon,
						value: dungeon,
					})),
				),
		)
		.addStringOption(option =>
			option.setName('level')
				.setDescription('The level you are looking to complete')
				.setRequired(true)
				.addChoices(...RangeChoices),
		)
		.addStringOption(option =>
			option.setName('role')
				.setDescription('The role you are looking to fill')
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