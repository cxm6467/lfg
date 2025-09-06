import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { GuildLinkingService } from '../guild/guild-linking-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the guild-config command interaction
 */
export const processGuildConfigCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    await interaction.deferReply({ flags: 64 }); // ephemeral

    const config = await GuildLinkingService.getGuildConfig(interaction.guildId!);
    
    if (!config) {
      await interaction.editReply({
        content: '❌ Failed to load guild configuration. Please try again later.'
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Guild Configuration')
      .setColor('#0099FF')
      .setTimestamp();

    // Add LFM channel info
    embed.addFields({
      name: 'LFM Channel',
      value: config.lfmChannelId ? `<#${config.lfmChannelId}>` : 'Not set - Use `/set-lfm-channel`',
      inline: true
    });

    // Add linked guilds
    if (config.linkedGuilds.length > 0) {
      const linkedGuildsInfo = config.linkedGuilds.map(link => 
        `**${link.guildName}** (${link.guildId})\n` +
        `X-Posting: ${link.xpostingEnabled ? '✅' : '❌'}\n` +
        `Voice: ${link.xpostingSettings.includeVoiceChannels ? '✅' : '❌'} | ` +
        `Raid: ${link.xpostingSettings.includeRaidProgress ? '✅' : '❌'} | ` +
        `M+: ${link.xpostingSettings.includeMythicPlusScore ? '✅' : '❌'}`
      ).join('\n\n');

      embed.addFields({
        name: `Linked Guilds (${config.linkedGuilds.length})`,
        value: linkedGuildsInfo,
        inline: false
      });
    } else {
      embed.addFields({
        name: 'Linked Guilds',
        value: 'None - Use `/link-guild` to connect with other servers',
        inline: false
      });
    }

    // Add settings
    embed.addFields({
      name: 'Settings',
      value: `**Auto Cleanup:** ${config.settings.autoCleanupHours}h\n**Voice Channels:** ${config.settings.voiceChannelAutoCreate ? '✅' : '❌'}\n**Warnings:** ${config.settings.warningMessageEnabled ? '✅' : '❌'}\n**X-Posting:** ${config.settings.xpostingEnabled ? '✅' : '❌'}`,
      inline: true
    });

    embed.setFooter({ 
      text: 'Use /help to see all available commands for guild management' 
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process guild-config command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while loading guild configuration. Please try again later.'
    });
  }
};
