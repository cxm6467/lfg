import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the set-main command interaction
 */
export const processSetMainCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    const characterName = interaction.options.getString('character', true);
    const realm = interaction.options.getString('realm', true);
    const region = interaction.options.getString('region', false) || 'us';

    logger(LogLevel.INFO, `🎮 [Set Main Command] User ${interaction.user.id} setting main character: ${characterName} on ${realm}-${region}`);

    await interaction.deferReply({ flags: 64 }); // ephemeral

    const success = await userProfileService.updateMainCharacter(
      interaction.user.id,
      characterName,
      realm,
      region
    );

    if (success) {
      const user = await userProfileService.getUserProfile(interaction.user.id);
      
      if (user && user.raiderIoData) {
        const embed = new EmbedBuilder()
          .setColor(userProfileService.getScoreEmbedColor(user.raiderIoData.mythicPlusScore))
          .setTitle('✅ Main Character Set')
          .setDescription(`Your main character has been set to: **${user.mainCharacter?.name}**`)
          .addFields([
            {
              name: 'Character Info',
              value: `**Realm:** ${user.mainCharacter?.realm}\n**Region:** ${user.mainCharacter?.region}\n**Class:** ${user.mainCharacter?.class}\n**Spec:** ${user.mainCharacter?.spec}`,
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
          content: '✅ Main character set, but failed to fetch Raider.IO data. The character may not meet the minimum requirements.'
        });
      }
    } else {
      await interaction.editReply({
        content: '❌ Failed to set your main character. Please check the character name, realm, and region.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process set-main command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while setting your main character. Please try again later.'
    });
  }
};
