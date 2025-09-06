import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the refresh-profile command interaction
 */
export const processRefreshProfileCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    logger(LogLevel.INFO, `🔄 [Refresh Profile Command] User ${interaction.user.id} refreshing Raider.IO data`);
    
    await interaction.deferReply({ flags: 64 }); // ephemeral

    const success = await userProfileService.refreshRaiderIOData(interaction.user.id);
    
    if (success) {
      const user = await userProfileService.getUserProfile(interaction.user.id);
      
      if (user && user.raiderIoData) {
        const embed = new EmbedBuilder()
          .setColor(userProfileService.getScoreEmbedColor(user.raiderIoData.mythicPlusScore))
          .setTitle('✅ Profile Refreshed')
          .setDescription('Your Raider.IO data has been updated!')
          .addFields([
            {
              name: 'Updated Data',
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
          content: '✅ Profile refresh attempted, but no Raider.IO data was found. Make sure your main character is set and meets the minimum requirements.'
        });
      }
    } else {
      await interaction.editReply({
        content: '❌ Failed to refresh your profile. Make sure you have a main character set and try again later.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process refresh-profile command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while refreshing your profile. Please try again later.'
    });
  }
};
