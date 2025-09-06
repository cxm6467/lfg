import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the profile command interaction
 */
export const processProfileCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply({ flags: 64 }); // ephemeral

    const user = await userProfileService.getUserProfile(interaction.user.id);
    
    if (!user) {
      await interaction.editReply({
        content: '❌ Failed to load your profile. Please try again later.'
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('👤 Your Profile')
      .setTimestamp();

    if (user.battleTag) {
      embed.addFields({
        name: 'BattleTag',
        value: `**${user.battleTag}**`,
        inline: true
      });
    } else {
      embed.addFields({
        name: 'BattleTag',
        value: 'Not set - Use `/set-battletag` to add it',
        inline: true
      });
    }

    if (user.mainCharacter) {
      embed.addFields({
        name: 'Main Character',
        value: `**${user.mainCharacter.name}**\n${user.mainCharacter.realm}-${user.mainCharacter.region}\n${user.mainCharacter.class} ${user.mainCharacter.spec}`,
        inline: true
      });
    } else {
      embed.addFields({
        name: 'Main Character',
        value: 'Not set - Use `/set-main` to add it',
        inline: true
      });
    }

    if (user.raiderIoData && user.raiderIoData.mythicPlusScore > 0) {
      const score = user.raiderIoData.mythicPlusScore;
      const color = userProfileService.getScoreEmbedColor(score);
      
      embed.setColor(color);
      embed.addFields({
        name: 'Raider.IO Data',
        value: `**M+ Score:** ${score}\n**Last Updated:** <t:${Math.floor(user.raiderIoData.lastUpdated.getTime() / 1000)}:R>`,
        inline: true
      });

      if (user.raiderIoData.raidProgress && user.raiderIoData.raidProgress.length > 0) {
        const raidInfo = user.raiderIoData.raidProgress
          .slice(0, 5) // Show top 5 raids
          .map(raid => `${raid.raidName} ${raid.difficulty}: ${raid.bossesKilled}/${raid.totalBosses}`)
          .join('\n');
        
        embed.addFields({
          name: 'Raid Progress',
          value: raidInfo,
          inline: false
        });
      }
    } else {
      embed.addFields({
        name: 'Raider.IO Data',
        value: 'No data available - Set your main character to fetch it',
        inline: true
      });
    }

    embed.addFields({
      name: 'Commands',
      value: '`/set-battletag` - Set your BattleTag\n`/set-main` - Set your main character\n`/refresh-profile` - Refresh your Raider.IO data',
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process profile command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while loading your profile. Please try again later.'
    });
  }
};
