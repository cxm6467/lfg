import { GuildConfigModel } from '../../models/guild-config';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { IGuildConfig } from '../../interfaces/IGuildConfig';

/**
 * Service to manage guild linking and cross-posting functionality
 */
export class GuildLinkingService {
  /**
   * Get or create guild configuration
   */
  static async getGuildConfig(guildId: string, guildName?: string): Promise<IGuildConfig | null> {
    try {
      let config = await GuildConfigModel.findOne({ guildId });
      
      if (!config) {
        config = await GuildConfigModel.create({
          guildId,
          guildName: guildName || 'Unknown Guild',
          linkedGuilds: [],
          settings: {
            autoCleanupHours: 24,
            voiceChannelAutoCreate: true,
            warningMessageEnabled: true,
            xpostingEnabled: true,
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger(LogLevel.INFO, `Created new guild config for ${guildId}`);
      }
      
      return config;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to get guild config: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Set LFM channel for a guild
   */
  static async setLfmChannel(guildId: string, channelId: string): Promise<boolean> {
    try {
      await GuildConfigModel.updateOne(
        { guildId },
        { 
          lfmChannelId: channelId,
          updatedAt: new Date()
        }
      );
      logger(LogLevel.INFO, `Set LFM channel ${channelId} for guild ${guildId}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to set LFM channel: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Link two guilds for cross-posting
   */
  static async linkGuilds(
    sourceGuildId: string, 
    targetGuildId: string, 
    targetGuildName: string,
    xpostingSettings?: any
  ): Promise<boolean> {
    try {
      const sourceConfig = await this.getGuildConfig(sourceGuildId);
      if (!sourceConfig) return false;

      // Check if already linked
      const existingLink = sourceConfig.linkedGuilds.find(link => link.guildId === targetGuildId);
      if (existingLink) {
        logger(LogLevel.WARN, `Guilds ${sourceGuildId} and ${targetGuildId} are already linked`);
        return false;
      }

      // Add link to source guild
      const newLink = {
        guildId: targetGuildId,
        guildName: targetGuildName,
        xpostingEnabled: true,
        xpostingSettings: {
          includeVoiceChannels: true,
          includeRaidProgress: true,
          includeMythicPlusScore: true,
          customMessage: undefined,
          ...xpostingSettings
        },
        linkedAt: new Date()
      };

      await GuildConfigModel.updateOne(
        { guildId: sourceGuildId },
        { 
          $push: { linkedGuilds: newLink },
          updatedAt: new Date()
        }
      );

      // Create reverse link
      const targetConfig = await this.getGuildConfig(targetGuildId, targetGuildName);
      if (targetConfig) {
        const reverseLink = {
          guildId: sourceGuildId,
          guildName: sourceConfig.guildName,
          xpostingEnabled: true,
          xpostingSettings: {
            includeVoiceChannels: true,
            includeRaidProgress: true,
            includeMythicPlusScore: true,
            customMessage: undefined,
            ...xpostingSettings
          },
          linkedAt: new Date()
        };

        await GuildConfigModel.updateOne(
          { guildId: targetGuildId },
          { 
            $push: { linkedGuilds: reverseLink },
            updatedAt: new Date()
          }
        );
      }

      logger(LogLevel.INFO, `Successfully linked guilds ${sourceGuildId} and ${targetGuildId}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to link guilds: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Unlink two guilds
   */
  static async unlinkGuilds(sourceGuildId: string, targetGuildId: string): Promise<boolean> {
    try {
      // Remove link from source guild
      await GuildConfigModel.updateOne(
        { guildId: sourceGuildId },
        { 
          $pull: { linkedGuilds: { guildId: targetGuildId } },
          updatedAt: new Date()
        }
      );

      // Remove reverse link from target guild
      await GuildConfigModel.updateOne(
        { guildId: targetGuildId },
        { 
          $pull: { linkedGuilds: { guildId: sourceGuildId } },
          updatedAt: new Date()
        }
      );

      logger(LogLevel.INFO, `Successfully unlinked guilds ${sourceGuildId} and ${targetGuildId}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to unlink guilds: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get linked guilds for a source guild
   */
  static async getLinkedGuilds(guildId: string): Promise<IGuildConfig['linkedGuilds']> {
    try {
      const config = await GuildConfigModel.findOne({ guildId });
      return config?.linkedGuilds || [];
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to get linked guilds: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Update x-posting settings for a guild link
   */
  static async updateXpostingSettings(
    sourceGuildId: string, 
    targetGuildId: string, 
    settings: any
  ): Promise<boolean> {
    try {
      await GuildConfigModel.updateOne(
        { 
          guildId: sourceGuildId,
          'linkedGuilds.guildId': targetGuildId
        },
        { 
          $set: { 
            'linkedGuilds.$.xpostingSettings': settings,
            updatedAt: new Date()
          }
        }
      );

      // Update reverse link
      await GuildConfigModel.updateOne(
        { 
          guildId: targetGuildId,
          'linkedGuilds.guildId': sourceGuildId
        },
        { 
          $set: { 
            'linkedGuilds.$.xpostingSettings': settings,
            updatedAt: new Date()
          }
        }
      );

      logger(LogLevel.INFO, `Updated x-posting settings for guilds ${sourceGuildId} and ${targetGuildId}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to update x-posting settings: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Toggle x-posting for a guild link
   */
  static async toggleXposting(sourceGuildId: string, targetGuildId: string, enabled: boolean): Promise<boolean> {
    try {
      await GuildConfigModel.updateOne(
        { 
          guildId: sourceGuildId,
          'linkedGuilds.guildId': targetGuildId
        },
        { 
          $set: { 
            'linkedGuilds.$.xpostingEnabled': enabled,
            updatedAt: new Date()
          }
        }
      );

      // Update reverse link
      await GuildConfigModel.updateOne(
        { 
          guildId: targetGuildId,
          'linkedGuilds.guildId': sourceGuildId
        },
        { 
          $set: { 
            'linkedGuilds.$.xpostingEnabled': enabled,
            updatedAt: new Date()
          }
        }
      );

      logger(LogLevel.INFO, `Toggled x-posting ${enabled ? 'on' : 'off'} for guilds ${sourceGuildId} and ${targetGuildId}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to toggle x-posting: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get all guilds that should receive x-posts from a source guild
   */
  static async getXpostTargets(sourceGuildId: string): Promise<Array<{
    guildId: string;
    guildName: string;
    lfmChannelId?: string;
    xpostingSettings: any;
  }>> {
    try {
      const config = await GuildConfigModel.findOne({ guildId: sourceGuildId });
      if (!config) return [];

      return config.linkedGuilds
        .filter(link => link.xpostingEnabled)
        .map(link => ({
          guildId: link.guildId,
          guildName: link.guildName,
          lfmChannelId: link.lfmChannelId,
          xpostingSettings: link.xpostingSettings
        }));
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to get x-post targets: ${(error as Error).message}`);
      return [];
    }
  }
}
