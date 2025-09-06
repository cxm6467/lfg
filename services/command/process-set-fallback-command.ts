import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Process the /set-fallback command - Admin only command to set fallback character
 */
export async function processSetFallbackCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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

		logger(LogLevel.INFO, `🔄 [Set Fallback] Admin ${interaction.user.tag} setting fallback character`);

		// Set the fallback character (Aliwicious from Illidan-US)
		const success = await userProfileService.updateMainCharacter(
			interaction.user.id,
			'Aliwicious',
			'Illidan',
			'us'
		);

		if (success) {
			// Refresh the Raider.IO data
			await userProfileService.refreshRaiderIOData(interaction.user.id);
			
			const user = await userProfileService.getUserProfile(interaction.user.id);
			
			if (user && user.raiderIoData) {
				const embed = new EmbedBuilder()
					.setColor(userProfileService.getScoreEmbedColor(user.raiderIoData.mythicPlusScore))
					.setTitle('✅ Fallback Character Set')
					.setDescription('Successfully set Aliwicious (Illidan-US) as your fallback character!')
					.addFields([
						{
							name: 'Character Info',
							value: `**Name:** ${user.mainCharacter?.name}\n**Realm:** ${user.mainCharacter?.realm}\n**Region:** ${user.mainCharacter?.region}`,
							inline: true
						},
						{
							name: 'Raider.IO Data',
							value: `**M+ Score:** ${user.raiderIoData.mythicPlusScore}\n**Last Updated:** <t:${Math.floor(user.raiderIoData.lastUpdated.getTime() / 1000)}:R>`,
							inline: true
						}
					])
					.setTimestamp();

				if (user.raiderIoData.raidProgress && user.raiderIoData.raidProgress.length > 0) {
					const raidInfo = user.raiderIoData.raidProgress
						.slice(0, 3) // Show top 3 raids
						.map(raid => `${raid.raidName} ${raid.difficulty}: ${raid.bossesKilled}/${raid.totalBosses}`)
						.join('\n');
					
					embed.addFields({
						name: 'Raid Progress',
						value: raidInfo,
						inline: false
					});
				}

				await interaction.editReply({ embeds: [embed] });
			} else {
				await interaction.editReply({
					content: '✅ Fallback character set, but failed to fetch Raider.IO data. Try `/refresh-profile` to update.'
				});
			}
		} else {
			await interaction.editReply({
				content: '❌ Failed to set fallback character. Please try again.'
			});
		}

		logger(LogLevel.INFO, `✅ [Set Fallback] Fallback character set for admin ${interaction.user.tag}`);

	} catch (error) {
		await interaction.editReply({
			content: '❌ An error occurred while setting the fallback character.'
		});
		logger(LogLevel.ERROR, `❌ [Set Fallback] Failed to process set-fallback command: ${(error as Error).message}`);
	}
}
