import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { GuildLinkingService } from '../guild/guild-linking-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Processes the link-guild command interaction
 */
export const processLinkGuildCommand = async (interaction: ChatInputCommandInteraction) => {
  try {
    const targetGuildId = interaction.options.getString('guild_id', true);
    const targetGuildName = interaction.options.getString('guild_name', true);
    const includeVoiceChannels = interaction.options.getBoolean('include_voice_channels') ?? true;
    const includeRaidProgress = interaction.options.getBoolean('include_raid_progress') ?? true;
    const includeMythicPlusScore = interaction.options.getBoolean('include_mythic_plus_score') ?? true;
    const customMessage = interaction.options.getString('custom_message');

    await interaction.deferReply({ flags: 64 }); // ephemeral

    const xpostingSettings = {
      includeVoiceChannels,
      includeRaidProgress,
      includeMythicPlusScore,
      customMessage
    };

    const success = await GuildLinkingService.linkGuilds(
      interaction.guildId!,
      targetGuildId,
      targetGuildName,
      xpostingSettings
    );
    
    if (success) {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Guilds Linked')
        .setDescription(`Successfully linked with guild: **${targetGuildName}**`)
        .addFields([
          {
            name: 'X-Posting Settings',
            value: `**Voice Channels:** ${includeVoiceChannels ? '✅' : '❌'}\n**Raid Progress:** ${includeRaidProgress ? '✅' : '❌'}\n**M+ Score:** ${includeMythicPlusScore ? '✅' : '❌'}`,
            inline: true
          },
          {
            name: 'Custom Message',
            value: customMessage || 'None',
            inline: true
          }
        ])
        .setFooter({ text: 'Both guilds will now cross-post LFG messages to each other' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to link guilds. The guilds may already be linked or there was an error.'
      });
    }
  } catch (error) {
    logger(LogLevel.ERROR, `Failed to process link-guild command: ${(error as Error).message}`);
    await interaction.editReply({
      content: '❌ An error occurred while linking guilds. Please try again later.'
    });
  }
};
