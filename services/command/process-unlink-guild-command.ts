import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { GuildLinkingService } from '../guild/guild-linking-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the unlink-guild command interaction
 */
export const processUnlinkGuildCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    const targetGuildId = interaction.options.getString('guild_id', true);

    await interaction.deferReply({ flags: 64 }); // ephemeral

    const success = await GuildLinkingService.unlinkGuilds(interaction.guildId!, targetGuildId);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('✅ Guilds Unlinked')
        .setDescription(`Successfully unlinked from guild: **${targetGuildId}**`)
        .setFooter({ text: 'Cross-posting between these guilds has been disabled' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to unlink guilds. The guilds may not be linked or there was an error.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process unlink-guild command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while unlinking guilds. Please try again later.'
    });
  }
};
