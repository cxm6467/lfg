import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { GuildLinkingService } from '../guild/guild-linking-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the set-lfm-channel command interaction
 */
export const processSetLfmChannelCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    const channel = interaction.options.getChannel('channel', true);
    
    if (channel.type !== 0 && channel.type !== 5 && channel.type !== 11) { // GuildText, GuildAnnouncement, GuildForum
      await interaction.reply({
        content: '❌ The channel must be a text channel.',
        flags: 64 // ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: 64 }); // ephemeral

    const success = await GuildLinkingService.setLfmChannel(interaction.guildId!, channel.id);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ LFM Channel Set')
        .setDescription(`LFM channel has been set to: ${channel}`)
        .addFields({
          name: 'Next Steps',
          value: 'Use `/link-guild` to connect with other Discord servers for cross-posting!',
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to set LFM channel. Please try again later.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process set-lfm-channel command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while setting the LFM channel. Please try again later.'
    });
  }
};
