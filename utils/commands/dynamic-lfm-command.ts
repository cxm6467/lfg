import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { DungeonName, DungeonType, MemberRole, RangeChoices } from '../../enums';
import { battleNetAPI } from '../../services/wow-api/battle-net-api';

/**
 * Creates dynamic LFM command with conditional level option based on difficulty
 * Since Discord doesn't support truly dynamic options, we create subcommands instead
 */

// Base options that are always required
const createDungeonOption = (dungeonChoices: Array<{name: string, value: string}>) => {
	return (option: any) =>
		option.setName('dungeon')
			.setDescription('The dungeon you are looking for')
			.setRequired(true)
			.addChoices(...dungeonChoices);
};

const baseRoleOption = (option: any) =>
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
		);

/**
 * Creates dynamic LFM command with current season dungeons
 */
export const createDynamicLfmCommand = async (): Promise<any> => {
	// Get current season dungeons
	let dungeonChoices: Array<{name: string, value: string}>;

	try {
		const dungeons = await battleNetAPI.getCurrentSeasonDungeons();
		dungeonChoices = dungeons.map(dungeon => ({
			name: dungeon.name,
			value: dungeon.name,
		}));

		// Fallback to War Within Season 3 dungeons if API fails
		if (dungeonChoices.length === 0) {
			dungeonChoices = [
				{ name: 'Eco-Dome Al\'dani', value: 'Eco-Dome Al\'dani' },
				{ name: 'Ara-Kara, City of Echoes', value: 'Ara-Kara, City of Echoes' },
				{ name: 'The Dawnbreaker', value: 'The Dawnbreaker' },
				{ name: 'Operation: Floodgate', value: 'Operation: Floodgate' },
				{ name: 'Priory of the Sacred Flame', value: 'Priory of the Sacred Flame' },
				{ name: 'Halls of Atonement', value: 'Halls of Atonement' },
				{ name: 'Tazavesh: Streets of Wonder', value: 'Tazavesh: Streets of Wonder' },
				{ name: 'Tazavesh: So\'leah\'s Gambit', value: 'Tazavesh: So\'leah\'s Gambit' },
			];
		}
	}
	catch (error) {
		console.error('Failed to fetch dungeons for command:', error);
		// Fallback to War Within Season 3 dungeons
		dungeonChoices = [
			{ name: 'Eco-Dome Al\'dani', value: 'Eco-Dome Al\'dani' },
			{ name: 'Ara-Kara, City of Echoes', value: 'Ara-Kara, City of Echoes' },
			{ name: 'The Dawnbreaker', value: 'The Dawnbreaker' },
			{ name: 'Operation: Floodgate', value: 'Operation: Floodgate' },
			{ name: 'Priory of the Sacred Flame', value: 'Priory of the Sacred Flame' },
			{ name: 'Halls of Atonement', value: 'Halls of Atonement' },
			{ name: 'Tazavesh: Streets of Wonder', value: 'Tazavesh: Streets of Wonder' },
			{ name: 'Tazavesh: So\'leah\'s Gambit', value: 'Tazavesh: So\'leah\'s Gambit' },
		];
	}

	// Create subcommands for each difficulty type
	return new SlashCommandBuilder()
		.setName('lfm')
		.setDescription('Looking for more command')
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('normal')
				.setDescription('Looking for more players for Normal difficulty')
				.addStringOption(createDungeonOption(dungeonChoices))
				.addStringOption(baseRoleOption),
		)
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('heroic')
				.setDescription('Looking for more players for Heroic difficulty')
				.addStringOption(createDungeonOption(dungeonChoices))
				.addStringOption(baseRoleOption),
		)
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('mythic')
				.setDescription('Looking for more players for Mythic+ (requires key level)')
				.addStringOption(createDungeonOption(dungeonChoices))
				.addStringOption(baseRoleOption)
				.addStringOption(option =>
					option.setName('level')
						.setDescription('The mythic+ key level you are looking to complete')
						.setRequired(true)
						.addChoices(...RangeChoices.filter(choice => choice.value !== 'N/A')), // Remove N/A for mythic
				),
		)
		.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
			subcommand
				.setName('delve')
				.setDescription('Looking for more players for Delves')
				.addStringOption(createDungeonOption(dungeonChoices))
				.addStringOption(baseRoleOption)
				.addStringOption(option =>
					option.setName('level')
						.setDescription('The delve tier level (optional)')
						.setRequired(false)
						.addChoices(...RangeChoices),
				),
		)
		.toJSON();
};

// Keep the old static command as fallback
export const dynamicLfmCommand = new SlashCommandBuilder()
	.setName('lfm')
	.setDescription('Looking for more command')
	.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
		subcommand
			.setName('normal')
			.setDescription('Looking for more players for Normal difficulty')
			.addStringOption(createDungeonOption([{ name: 'Loading...', value: 'loading' }]))
			.addStringOption(baseRoleOption),
	)
	.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
		subcommand
			.setName('heroic')
			.setDescription('Looking for more players for Heroic difficulty')
			.addStringOption(createDungeonOption([{ name: 'Loading...', value: 'loading' }]))
			.addStringOption(baseRoleOption),
	)
	.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
		subcommand
			.setName('mythic')
			.setDescription('Looking for more players for Mythic+ (requires key level)')
			.addStringOption(createDungeonOption([{ name: 'Loading...', value: 'loading' }]))
			.addStringOption(baseRoleOption)
			.addStringOption(option =>
				option.setName('level')
					.setDescription('The mythic+ key level you are looking to complete')
					.setRequired(true)
					.addChoices(...RangeChoices.filter(choice => choice.value !== 'N/A')), // Remove N/A for mythic
			),
	)
	.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
		subcommand
			.setName('delve')
			.setDescription('Looking for more players for Delves')
			.addStringOption(createDungeonOption([{ name: 'Loading...', value: 'loading' }]))
			.addStringOption(baseRoleOption)
			.addStringOption(option =>
				option.setName('level')
					.setDescription('The delve tier level (optional)')
					.setRequired(false)
					.addChoices(...RangeChoices),
			),
	)
	.toJSON();

// Legacy command removed - using dynamic command instead