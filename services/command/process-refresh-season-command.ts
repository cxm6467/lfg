import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { SeasonService } from '../season/season-service';

/**
 * Process the /refresh-season command - Admin only command to refresh current season data
 */
export async function processRefreshSeasonCommand(interaction: ChatInputCommandInteraction): Promise<void> {
	try {
		// Check if user has administrator permissions
		if (!interaction.memberPermissions?.has('Administrator')) {
			await interaction.reply({
				content: '❌ **Access Denied**\nOnly administrators can use this command.',
				ephemeral: true
			});
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		logger(LogLevel.INFO, `🔄 [Refresh Season] Admin ${interaction.user.tag} refreshing season data`);

		// Force refresh the current season
		const currentSeasonId = await SeasonService.forceRefreshCurrentSeason();
		
		if (currentSeasonId) {
			// Get season info for display
			const seasonInfo = await SeasonService.getSeasonInfo();
			
			const embed = new EmbedBuilder()
				.setColor('#00FF00')
				.setTitle('✅ Season Data Refreshed')
				.setDescription('Successfully refreshed current season data from Raider.IO API!')
				.addFields([
					{
						name: 'Current Season',
						value: `**ID:** ${seasonInfo.currentSeasonId}\n**Name:** ${seasonInfo.seasonName || 'Unknown'}`,
						inline: true
					},
					{
						name: 'Cache Status',
						value: `**From Cache:** ${seasonInfo.isFromCache ? 'Yes' : 'No'}\n**Last Updated:** ${seasonInfo.lastUpdated ? `<t:${Math.floor(seasonInfo.lastUpdated.getTime() / 1000)}:R>` : 'Never'}`,
						inline: true
					}
				])
				.setTimestamp()
				.setFooter({ text: 'Season data is cached for 24 hours to reduce API calls' });

			await interaction.editReply({ embeds: [embed] });
		} else {
			await interaction.editReply({
				content: '❌ Failed to refresh season data. The API might be unavailable or there was an error.'
			});
		}

		logger(LogLevel.INFO, `✅ [Refresh Season] Season refresh completed for admin ${interaction.user.tag}`);

	} catch (error) {
		await interaction.editReply({
			content: '❌ An error occurred while refreshing season data.'
		});
		logger(LogLevel.ERROR, `❌ [Refresh Season] Failed to process refresh-season command: ${(error as Error).message}`);
	}
}
