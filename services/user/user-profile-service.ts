import { UserModel } from '../../models/user';
import { raiderIOAPI } from '../raiderio/raiderio-api';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { IUser } from '../../interfaces/IUser';
import { ErrorHandlerService } from '../error/error-handler-service';

/**
 * Service to manage user profiles and Battle.net integration
 */
export class UserProfileService {
  /**
   * Get or create user profile
   */
  async getUserProfile(discordUserId: string): Promise<IUser | null> {
    try {
      let user = await UserModel.findOne({ discordUserId });
      
      if (!user) {
        // Create new user profile with fallback character
        user = await UserModel.create({
          discordUserId,
          mainCharacter: {
            name: 'Aliwicious',
            realm: 'Illidan',
            region: 'us',
            class: 'Unknown',
            spec: 'Unknown'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger(LogLevel.INFO, `Created new user profile for Discord user ${discordUserId} with fallback character Aliwicious`);
      }
      
      return user;
    } catch (error) {
      return await ErrorHandlerService.handleDatabaseError(
        'get user profile',
        error,
        null
      );
    }
  }

  /**
   * Update user's BattleTag
   */
  async updateBattleTag(discordUserId: string, battleTag: string): Promise<boolean> {
    try {
      const user = await this.getUserProfile(discordUserId);
      if (!user) return false;

      await UserModel.updateOne(
        { discordUserId },
        { 
          battleTag,
          updatedAt: new Date()
        }
      );

      logger(LogLevel.INFO, `Updated BattleTag for user ${discordUserId}: ${battleTag}`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `Failed to update BattleTag: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Update user's main character information
   */
  async updateMainCharacter(
    discordUserId: string, 
    characterName: string, 
    realm: string, 
    region: string = 'us'
  ): Promise<boolean> {
    try {
      logger(LogLevel.INFO, `👤 [User Profile] Updating main character for user ${discordUserId}: ${characterName} on ${realm}-${region}`);
      
      const user = await this.getUserProfile(discordUserId);
      if (!user) {
        logger(LogLevel.WARN, `⚠️ [User Profile] User profile not found for ${discordUserId}`);
        return false;
      }

      // Fetch character data from Raider.IO
      const profile = await raiderIOAPI.getCharacterProfile(region, realm, characterName);
      if (!profile) {
        logger(LogLevel.WARN, `⚠️ [User Profile] Character ${characterName} not found on Raider.IO`);
        return false;
      }

      const mythicPlusScore = await raiderIOAPI.getCurrentMythicPlusScore(profile);
      const raidProgression = raiderIOAPI.getRaidProgression(profile);

      logger(LogLevel.INFO, `💾 [User Profile] Saving character data: M+ Score: ${mythicPlusScore}, Raids: ${raidProgression.length}`);

      await UserModel.updateOne(
        { discordUserId },
        {
          mainCharacter: {
            name: profile.name,
            realm: profile.realm,
            region: profile.region,
            class: profile.class,
            spec: profile.activeSpecName
          },
          raiderIoData: {
            mythicPlusScore,
            raidProgress: raidProgression,
            lastUpdated: new Date()
          },
          updatedAt: new Date()
        }
      );

      logger(LogLevel.INFO, `✅ [User Profile] Successfully updated main character for user ${discordUserId}: ${characterName} (${mythicPlusScore} M+ score)`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [User Profile] Failed to update main character: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Refresh user's Raider.IO data
   */
  async refreshRaiderIOData(discordUserId: string): Promise<boolean> {
    try {
      logger(LogLevel.INFO, `🔄 [User Profile] Refreshing Raider.IO data for user ${discordUserId}`);
      
      const user = await this.getUserProfile(discordUserId);
      if (!user || !user.mainCharacter) {
        logger(LogLevel.WARN, `⚠️ [User Profile] No main character set for user ${discordUserId}`);
        return false;
      }

      const { name, realm, region } = user.mainCharacter;
      logger(LogLevel.INFO, `🔍 [User Profile] Refreshing data for character: ${name} on ${realm}-${region}`);
      
      const profile = await raiderIOAPI.getCharacterProfile(region, realm, name);
      
      if (!profile) {
        logger(LogLevel.WARN, `⚠️ [User Profile] Failed to refresh Raider.IO data for ${name}`);
        return false;
      }

      const mythicPlusScore = await raiderIOAPI.getCurrentMythicPlusScore(profile);
      const raidProgression = raiderIOAPI.getRaidProgression(profile);

      logger(LogLevel.INFO, `💾 [User Profile] Updating database with fresh data: M+ Score: ${mythicPlusScore}, Raids: ${raidProgression.length}`);

      await UserModel.updateOne(
        { discordUserId },
        {
          raiderIoData: {
            mythicPlusScore,
            raidProgress: raidProgression,
            lastUpdated: new Date()
          },
          updatedAt: new Date()
        }
      );

      logger(LogLevel.INFO, `✅ [User Profile] Successfully refreshed Raider.IO data for user ${discordUserId}: ${mythicPlusScore} M+ score`);
      return true;
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [User Profile] Failed to refresh Raider.IO data: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get user's formatted display string with M+ score and raid progress
   */
  async getFormattedUserDisplay(user: IUser, discordMention: string): Promise<string> {
    let display = discordMention;

    // If user has no Raider.IO data but has a main character, try to fetch it
    if (!user.raiderIoData && user.mainCharacter) {
      try {
        logger(LogLevel.DEBUG, `🔄 [User Profile] Auto-fetching Raider.IO data for ${user.mainCharacter.name}`);
        const profile = await raiderIOAPI.getCharacterProfile(
          user.mainCharacter.region, 
          user.mainCharacter.realm, 
          user.mainCharacter.name
        );
        
        if (profile) {
          const mythicPlusScore = await raiderIOAPI.getCurrentMythicPlusScore(profile);
          const raidProgression = raiderIOAPI.getRaidProgression(profile);
          
          // Update user with fresh data
          await UserModel.updateOne(
            { discordUserId: user.discordUserId },
            {
              raiderIoData: {
                mythicPlusScore,
                raidProgress: raidProgression,
                lastUpdated: new Date()
              },
              updatedAt: new Date()
            }
          );
          
          // Update the user object for this display
          user.raiderIoData = {
            mythicPlusScore,
            raidProgress: raidProgression,
            lastUpdated: new Date()
          };
          
          logger(LogLevel.INFO, `✅ [User Profile] Auto-fetched Raider.IO data for ${user.mainCharacter.name}: ${mythicPlusScore} M+ score`);
        }
      } catch (error) {
        logger(LogLevel.WARN, `⚠️ [User Profile] Failed to auto-fetch Raider.IO data: ${(error as Error).message}`);
      }
    }

    if (user.raiderIoData && user.raiderIoData.mythicPlusScore > 0) {
      const score = user.raiderIoData.mythicPlusScore;
      const color = this.getScoreColor(score);
      display += ` **${score}**`;
    }

    if (user.raiderIoData?.raidProgress && user.raiderIoData.raidProgress.length > 0) {
      const currentRaid = user.raiderIoData.raidProgress[0]; // Most recent raid
      display += ` *(${currentRaid.raidName} ${currentRaid.difficulty}: ${currentRaid.bossesKilled}/${currentRaid.totalBosses})*`;
    }

    return display;
  }

  /**
   * Get color for mythic plus score based on prestige ranges
   */
  private getScoreColor(score: number): string {
    if (score >= 3000) return '🟠'; // Orange - Cutting Edge
    if (score >= 2500) return '🟣'; // Purple - High end
    if (score >= 2000) return '🔵'; // Blue - Good
    if (score >= 1500) return '🟢'; // Green - Decent
    if (score >= 1000) return '🟡'; // Yellow - Beginner
    return '⚪'; // White - Low
  }

  /**
   * Get Discord color for embed based on mythic plus score
   */
  getScoreEmbedColor(score: number): number {
    if (score >= 3000) return 0xFF8C00; // Orange
    if (score >= 2500) return 0x9932CC; // Purple
    if (score >= 2000) return 0x1E90FF; // Blue
    if (score >= 1500) return 0x32CD32; // Green
    if (score >= 1000) return 0xFFD700; // Yellow
    return 0xFFFFFF; // White
  }
}

export const userProfileService = new UserProfileService();
