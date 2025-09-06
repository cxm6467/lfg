import { Client } from 'discord.js';
import { GroupModel } from '../../models/group';
import { GuildConfigModel } from '../../models/guild-config';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Performs startup cleanup of past events and ensures system consistency
 */
export class StartupCleanupService {
  /**
   * Clean up past events and ensure system consistency on startup
   */
  static async performStartupCleanup(client: Client): Promise<void> {
    logger(LogLevel.INFO, 'Starting startup cleanup process...');
    
    try {
      // 1. Clean up expired groups
      await this.cleanupExpiredGroups(client);
      
      // 2. Validate and fix guild configurations
      await this.validateGuildConfigurations(client);
      
      // 3. Clean up orphaned voice channels
      await this.cleanupOrphanedVoiceChannels(client);
      
      // 4. Update upcoming event schedules
      await this.updateUpcomingSchedules();
      
      logger(LogLevel.INFO, 'Startup cleanup completed successfully');
    } catch (error) {
      logger(LogLevel.ERROR, `Startup cleanup failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up groups that have expired (past their start time + buffer)
   */
  private static async cleanupExpiredGroups(client: Client): Promise<void> {
    logger(LogLevel.INFO, 'Cleaning up expired groups...');
    
    const now = new Date();
    const bufferMinutes = 30; // 30 minutes buffer after start time
    const cutoffTime = new Date(now.getTime() - (bufferMinutes * 60 * 1000));
    
    const expiredGroups = await GroupModel.find({
      startTime: { $lt: cutoffTime },
      archived: { $ne: true }
    });
    
    logger(LogLevel.INFO, `Found ${expiredGroups.length} expired groups to clean up`);
    
    for (const group of expiredGroups) {
      try {
        await this.cleanupSingleGroup(client, group);
        await GroupModel.updateOne(
          { groupId: group.groupId }, 
          { 
            archived: true,
            archivedAt: new Date(),
            archivedBy: 'system',
            archivedReason: 'Expired group cleanup',
            cleanedUp: true,
            cleanedUpAt: new Date(),
            cleanedUpBy: 'system'
          }
        );
        logger(LogLevel.DEBUG, `Cleaned up expired group: ${group.groupId}`);
      } catch (error) {
        logger(LogLevel.ERROR, `Failed to cleanup group ${group.groupId}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Clean up a single group's resources
   */
  private static async cleanupSingleGroup(client: Client, group: any): Promise<void> {
    // Delete voice channel if it exists
    if (group.voiceChannelId) {
      try {
        const guild = await client.guilds.fetch(group.guildId);
        const voiceChannel = await guild?.channels.fetch(group.voiceChannelId);
        if (voiceChannel) {
          await voiceChannel.delete();
          logger(LogLevel.DEBUG, `Deleted voice channel: ${group.voiceChannelId}`);
        }
      } catch (error) {
        logger(LogLevel.WARN, `Failed to delete voice channel ${group.voiceChannelId}: ${(error as Error).message}`);
      }
    }

    // Archive thread if it exists
    if (group.threadId) {
      try {
        const guild = await client.guilds.fetch(group.guildId);
        const channel = await guild?.channels.fetch(group.channelId);
        if (channel && (channel.type === 0 || channel.type === 5 || channel.type === 11)) { // GuildText, GuildAnnouncement, GuildForum
          const textChannel = channel as any;
          if (textChannel.threads) {
            const thread = await textChannel.threads.fetch(group.threadId);
            if (thread) {
              await thread.setArchived(true);
              logger(LogLevel.DEBUG, `Archived thread: ${group.threadId}`);
            }
          }
        }
      } catch (error) {
        logger(LogLevel.WARN, `Failed to archive thread ${group.threadId}: ${(error as Error).message}`);
      }
    }

    // Delete embed message if it exists
    if (group.embedId && group.channelId) {
      try {
        const guild = await client.guilds.fetch(group.guildId);
        const channel = await guild?.channels.fetch(group.channelId);
        if (channel && (channel.type === 0 || channel.type === 5 || channel.type === 11)) { // GuildText, GuildAnnouncement, GuildForum
          const textChannel = channel as any;
          const message = await textChannel.messages.fetch(group.embedId);
          if (message) {
            await message.delete();
            logger(LogLevel.DEBUG, `Deleted embed message: ${group.embedId}`);
          }
        }
      } catch (error) {
        logger(LogLevel.WARN, `Failed to delete embed message ${group.embedId}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Validate and fix guild configurations
   */
  private static async validateGuildConfigurations(client: Client): Promise<void> {
    logger(LogLevel.INFO, 'Validating guild configurations...');
    
    const guildConfigs = await GuildConfigModel.find({});
    
    for (const config of guildConfigs) {
      try {
        const guild = await client.guilds.fetch(config.guildId);
        if (!guild) {
          logger(LogLevel.WARN, `Guild ${config.guildId} not found, removing configuration`);
          await GuildConfigModel.deleteOne({ guildId: config.guildId });
          continue;
        }

        // Update guild name if it changed
        if (config.guildName !== guild.name) {
          await GuildConfigModel.updateOne(
            { guildId: config.guildId },
            { guildName: guild.name }
          );
          logger(LogLevel.DEBUG, `Updated guild name for ${config.guildId}: ${guild.name}`);
        }

        // Validate LFM channel
        if (config.lfmChannelId) {
          const channel = await guild.channels.fetch(config.lfmChannelId);
          if (!channel) {
            logger(LogLevel.WARN, `LFM channel ${config.lfmChannelId} not found for guild ${config.guildId}`);
            await GuildConfigModel.updateOne(
              { guildId: config.guildId },
              { $unset: { lfmChannelId: 1 } }
            );
          }
        }

        // Validate linked guilds
        const validLinkedGuilds = [];
        for (const linkedGuild of config.linkedGuilds) {
          try {
            const linkedGuildObj = await client.guilds.fetch(linkedGuild.guildId);
            if (linkedGuildObj) {
              validLinkedGuilds.push({
                ...linkedGuild,
                guildName: linkedGuildObj.name
              });
            }
          } catch (error) {
            logger(LogLevel.WARN, `Linked guild ${linkedGuild.guildId} not found, removing from config`);
          }
        }

        if (validLinkedGuilds.length !== config.linkedGuilds.length) {
          await GuildConfigModel.updateOne(
            { guildId: config.guildId },
            { linkedGuilds: validLinkedGuilds }
          );
        }

      } catch (error) {
        logger(LogLevel.ERROR, `Failed to validate guild config ${config.guildId}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Clean up orphaned voice channels
   */
  private static async cleanupOrphanedVoiceChannels(client: Client): Promise<void> {
    logger(LogLevel.INFO, 'Cleaning up orphaned voice channels...');
    
    const groupsWithVoiceChannels = await GroupModel.find({
      voiceChannelId: { $exists: true, $ne: null },
      archived: { $ne: true }
    });

    for (const group of groupsWithVoiceChannels) {
      try {
        if (!group.guildId || !group.voiceChannelId) continue;
        
        const guild = await client.guilds.fetch(group.guildId);
        const voiceChannel = await guild?.channels.fetch(group.voiceChannelId);
        
        if (!voiceChannel) {
          // Voice channel doesn't exist, remove reference
          await GroupModel.updateOne(
            { groupId: group.groupId },
            { $unset: { voiceChannelId: 1 } }
          );
          logger(LogLevel.DEBUG, `Removed orphaned voice channel reference for group ${group.groupId}`);
        }
      } catch (error) {
        logger(LogLevel.WARN, `Failed to check voice channel for group ${group.groupId}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Update upcoming event schedules
   */
  private static async updateUpcomingSchedules(): Promise<void> {
    logger(LogLevel.INFO, 'Updating upcoming event schedules...');
    
    const upcomingGroups = await GroupModel.find({
      startTime: { $gt: new Date() },
      archived: { $ne: true }
    });

    logger(LogLevel.INFO, `Found ${upcomingGroups.length} upcoming groups`);
    
    // Reset warning flags for upcoming groups (in case bot was restarted)
    const groupsNeedingWarningReset = upcomingGroups.filter(group => group.warningMessageSent);
    if (groupsNeedingWarningReset.length > 0) {
      logger(LogLevel.INFO, `🔄 Resetting warning flags for ${groupsNeedingWarningReset.length} groups`);
      await GroupModel.updateMany(
        { 
          groupId: { $in: groupsNeedingWarningReset.map(g => g.groupId) },
          startTime: { $gt: new Date() }
        },
        { warningMessageSent: false }
      );
    }
    
    // Log upcoming events for monitoring
    for (const group of upcomingGroups) {
      const timeUntilStart = Math.round((group.startTime!.getTime() - Date.now()) / 1000 / 60);
      logger(LogLevel.INFO, `📅 Group "${group.groupName}" starts in ${timeUntilStart} minutes`);
    }
  }
}
