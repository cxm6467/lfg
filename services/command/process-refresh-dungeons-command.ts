import { ChatInputCommandInteraction } from 'discord.js';
import { battleNetAPI } from '../wow-api/battle-net-api';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import fs from 'fs/promises';

/**
 * Processes the refresh-dungeons command interaction by fetching current season dungeons from Battle.net API
 * and updating the local dungeon constants file.
 *
 * @param interaction - The interaction object from the refresh-dungeons command.
 * @returns A promise that resolves when the dungeons have been refreshed.
 */
export const processRefreshDungeonsCommand = async (interaction: ChatInputCommandInteraction) => {
	// Defer reply since API calls might take time
	await interaction.deferReply({ flags: 64 }); // ephemeral

	try {
		logger(LogLevel.INFO, 'Fetching current season dungeons from Battle.net API');

		// Get current season dungeons
		const currentDungeons = await battleNetAPI.getCurrentSeasonDungeons();

		if (currentDungeons.length === 0) {
			await interaction.editReply({
				content: 'Failed to fetch dungeons from Battle.net API. Please check API credentials.',
			});
			return;
		}

		// Create enum values for TypeScript
		const enumValues = currentDungeons
			.map(dungeon => `${dungeon.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')} = '${dungeon.name}'`)
			.join(',\n\t');

		// Create DUNGEON_URLS array
		const dungeonUrls = currentDungeons
			.map(dungeon => `\t{ key: '${dungeon.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}', url: '', borderColor: '#DCB106' }`)
			.join(',\n');

		// Generate new constants file content
		const newConstantsContent = `// Auto-generated from Battle.net API - Last updated: ${new Date().toISOString()}
export enum DungeonName {
\t${enumValues},
\tAny = 'Any',
}

export const DUNGEON_URLS = [
${dungeonUrls},
\t{ key: 'ANY', url: '', borderColor: '#DCB106' },
];

// You may need to manually add appropriate image URLs and border colors for each dungeon
`;

		// Write to a new file (don't overwrite existing constants)
		const outputPath = '/home/caboose/dev/lfg/consts/generated-dungeons.ts';
		await fs.writeFile(outputPath, newConstantsContent, 'utf-8');

		const dungeonNames = currentDungeons.map(d => d.name).join(', ');

		await interaction.editReply({
			content: '✅ **Dungeons refreshed successfully!**\n\n' +
					`**Current Season Dungeons (${currentDungeons.length}):**\n${dungeonNames}\n\n` +
					'Generated file: `consts/generated-dungeons.ts`\n\n' +
					'⚠️ **Note:** You\'ll need to manually update image URLs and colors, then replace the existing dungeon constants.',
		});

		logger(LogLevel.INFO, `Successfully generated dungeon constants for ${currentDungeons.length} dungeons`);

	}
	catch (error) {
		logger(LogLevel.ERROR, `Failed to refresh dungeons: ${(error as Error).message}`);
		await interaction.editReply({
			content: `❌ **Failed to refresh dungeons:**\n\`\`\`${(error as Error).message}\`\`\``,
		});
	}
};