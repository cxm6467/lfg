import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the set-battletag command interaction
 */
export const processSetBattleTagCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    const battleTag = interaction.options.getString('battletag', true);
    
    // Validate BattleTag format (should be Name#1234)
    const battleTagRegex = /^[a-zA-Z0-9]+#[0-9]{4,5}$/;
    if (!battleTagRegex.test(battleTag)) {
      await interaction.reply({
        content: '❌ Invalid BattleTag format. Please use the format: `Name#1234`',
        flags: 64 // ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: 64 }); // ephemeral

    const success = await userProfileService.updateBattleTag(interaction.user.id, battleTag);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ BattleTag Updated')
        .setDescription(`Your BattleTag has been set to: **${battleTag}**`)
        .addFields({
          name: 'Next Steps',
          value: 'Use `/set-main` to set your main character and fetch your Raider.IO data!',
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to update your BattleTag. Please try again later.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process set-battletag command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while updating your BattleTag. Please try again later.'
    });
  }
};
