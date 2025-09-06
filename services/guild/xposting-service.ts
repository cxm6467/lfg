import { Client, EmbedBuilder, ColorResolvable } from 'discord.js';
import { GroupModel } from '../../models/group';
import { GuildLinkingService } from './guild-linking-service';
import { userProfileService } from '../user/user-profile-service';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Service to handle cross-guild posting of LFG messages
 */
export class XpostingService {
  /**
   * Post a group to all linked guilds
   */
  static async postToLinkedGuilds(client: Client, groupId: string): Promise<void> {
    try {
      const group = await GroupModel.findOne({ groupId });
      if (!group || !group.guildId) {
        logger(LogLevel.WARN, `Group ${groupId} not found or missing guild ID`);
        return;
      }

      const xpostTargets = await GuildLinkingService.getXpostTargets(group.guildId);
      if (xpostTargets.length === 0) {
        logger(LogLevel.DEBUG, `No x-post targets found for guild ${group.guildId}`);
        return;
      }

      logger(LogLevel.INFO, `Posting group ${groupId} to ${xpostTargets.length} linked guilds`);

      for (const target of xpostTargets) {
        try {
          await this.postToTargetGuild(client, group, target);
        } catch (error) {
          logger(LogLevel.ERROR, `Failed to post to guild ${target.guildId}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to post to linked guilds: ${(error as Error).message}`);
    }
  }

  /**
   * Post a group to a specific target guild
   */
  private static async postToTargetGuild(
    client: Client, 
    group: any, 
    target: {
      guildId: string;
      guildName: string;
      lfmChannelId?: string;
      xpostingSettings: any;
    }
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(target.guildId);
      if (!guild) {
        logger(LogLevel.WARN, `Target guild ${target.guildId} not found`);
        return;
      }

      // Use configured LFM channel or find a suitable channel
      let channelId = target.lfmChannelId;
      if (!channelId) {
        // Try to find a channel with "lfm" or "looking" in the name
        const channels = guild.channels.cache.filter(channel => 
          channel.isTextBased() && 
          (channel.name.toLowerCase().includes('lfm') || 
           channel.name.toLowerCase().includes('looking'))
        );
        
        if (channels.size > 0) {
          channelId = channels.first()?.id;
        } else {
          // Fallback to first available text channel
          const textChannels = guild.channels.cache.filter(channel => channel.isTextBased());
          if (textChannels.size > 0) {
            channelId = textChannels.first()?.id;
          }
        }
      }

      if (!channelId) {
        logger(LogLevel.WARN, `No suitable channel found in guild ${target.guildId}`);
        return;
      }

      const channel = await guild.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        logger(LogLevel.WARN, `Channel ${channelId} not found or not text-based`);
        return;
      }

      // Create x-post embed
      const embed = await this.createXpostEmbed(group, target.xpostingSettings);
      
      // Add custom message if configured
      let content = '';
      if (target.xpostingSettings.customMessage) {
        content = target.xpostingSettings.customMessage;
      }

      await channel.send({
        content,
        embeds: [embed]
      });

      logger(LogLevel.INFO, `Successfully posted group ${group.groupId} to guild ${target.guildId}`);
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to post to target guild ${target.guildId}: ${(error as Error).message}`);
    }
  }

  /**
   * Create an embed for x-posting
   */
  private static async createXpostEmbed(group: any, settings: any): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
      .setTitle(`🔗 Cross-Post: ${group.groupName}`)
      .setColor('#0099FF')
      .setTimestamp();

    // Add dungeon information
    if (group.dungeon) {
      embed.addFields({
        name: '**Dungeon**',
        value: group.dungeon.name && group.dungeon.type && group.dungeon.level
          ? `${group.dungeon.name} ${group.dungeon.type} ${group.dungeon.level}`
          : 'None',
        inline: true
      });
    }

    // Add start time
    if (group.startTime) {
      const startTimeUnix = Math.floor(group.startTime.getTime() / 1000);
      embed.addFields({
        name: '**Start Time**',
        value: `<t:${startTimeUnix}:F>\n<t:${startTimeUnix}:R>`,
        inline: true
      });
    }

    // Add members with enhanced display if settings allow
    if (group.members && group.members.length > 0) {
      const memberDisplays = [];
      
      for (const member of group.members) {
        if (member.userId) {
          let memberDisplay = `<@${member.userId}>`;
          
          // Add M+ score and raid progress if enabled
          if (settings.includeMythicPlusScore || settings.includeRaidProgress) {
            try {
              const user = await userProfileService.getUserProfile(member.userId);
              if (user && user.raiderIoData) {
                if (settings.includeMythicPlusScore && user.raiderIoData.mythicPlusScore > 0) {
                  const score = user.raiderIoData.mythicPlusScore;
                  const color = userProfileService.getScoreEmbedColor(score);
                  memberDisplay += ` **${score}**`;
                }
                
                if (settings.includeRaidProgress && user.raiderIoData.raidProgress && user.raiderIoData.raidProgress.length > 0) {
                  const currentRaid = user.raiderIoData.raidProgress[0];
                  memberDisplay += ` *(${currentRaid.raidName} ${currentRaid.difficulty}: ${currentRaid.bossesKilled}/${currentRaid.totalBosses})*`;
                }
              }
            } catch (error) {
              logger(LogLevel.DEBUG, `Failed to get user profile for x-post: ${(error as Error).message}`);
            }
          }
          
          memberDisplays.push(`${member.role}: ${memberDisplay}`);
        }
      }
      
      embed.addFields({
        name: '**Members**',
        value: memberDisplays.join('\n') || 'None',
        inline: false
      });
    }

    // Add voice channel if enabled and available
    if (settings.includeVoiceChannels && group.voiceChannelId) {
      embed.addFields({
        name: '**Voice Channel**',
        value: `<#${group.voiceChannelId}>`,
        inline: true
      });
    }

    // Add notes if available
    if (group.notes) {
      embed.addFields({
        name: '**Notes**',
        value: group.notes,
        inline: false
      });
    }

    // Add footer with source guild info
    embed.setFooter({ 
      text: `From: ${group.guildId} | Use /join group_id:${group.groupId.substring(0, 8)} to join` 
    });

    return embed;
  }

  /**
   * Update an existing x-post when group changes
   */
  static async updateXpost(client: Client, groupId: string): Promise<void> {
    // This would require storing x-post message IDs in the database
    // For now, we'll just create a new post
    await this.postToLinkedGuilds(client, groupId);
  }

  /**
   * Remove x-posts when group is deleted
   */
  static async removeXpost(client: Client, groupId: string): Promise<void> {
    // This would require storing x-post message IDs in the database
    // For now, we'll just log the removal
    logger(LogLevel.INFO, `Group ${groupId} was removed - x-posts should be cleaned up`);
  }
}
