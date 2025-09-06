import axios from 'axios';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { ErrorHandlerService } from '../error/error-handler-service';
import { SeasonService } from '../season/season-service';

interface RaiderIOCharacterProfile {
  name: string;
  race: string;
  class: string;
  activeSpecName: string;
  activeSpecRole: string;
  gender: string;
  faction: string;
  achievementPoints: number;
  honorableKills: number;
  thumbnailUrl: string;
  region: string;
  realm: string;
  lastCrawledAt: string;
  profileUrl: string;
  profileBanner: string;
  mythicPlusScoresBySeason: Array<{
    season: string;
    scores: {
      all: number;
      dps: number;
      healer: number;
      tank: number;
    };
    segments: {
      all: {
        score: number;
        color: string;
      };
      dps: {
        score: number;
        color: string;
      };
      healer: {
        score: number;
        color: string;
      };
      tank: {
        score: number;
        color: string;
      };
    };
  }>;
  raidProgression: Record<string, {
    summary: string;
    totalBosses: number;
    normalBossesKilled: number;
    heroicBossesKilled: number;
    mythicBossesKilled: number;
  }>;
}

interface RaiderIOGuildProfile {
  name: string;
  faction: string;
  region: string;
  realm: string;
  lastCrawledAt: string;
  profileUrl: string;
  members: Array<{
    character: {
      name: string;
      race: string;
      class: string;
      activeSpecName: string;
      activeSpecRole: string;
      gender: string;
      achievementPoints: number;
      honorableKills: number;
      thumbnailUrl: string;
      lastCrawledAt: string;
      profileUrl: string;
    };
    rank: number;
    rankName: string;
    joinedAt: string;
  }>;
}

/**
 * Service to interact with Raider.IO API
 */
export class RaiderIOAPI {
  private baseUrl = 'https://raider.io/api/v1';

  /**
   * Get character profile with mythic plus scores and raid progression
   */
  async getCharacterProfile(region: string, realm: string, characterName: string): Promise<RaiderIOCharacterProfile | null> {
    try {
      const url = `${this.baseUrl}/characters/profile`;
      const params = {
        region: region.toLowerCase(),
        realm: realm.toLowerCase().replace(/\s+/g, '-'),
        name: characterName.toLowerCase(),
        fields: 'mythic_plus_scores_by_season:current,raid_progression'
      };

      logger(LogLevel.INFO, `🔍 [Raider.IO API] Fetching character profile for ${characterName} on ${realm}-${region}`);
      logger(LogLevel.DEBUG, `🔍 [Raider.IO API] Request URL: ${url}`);
      logger(LogLevel.DEBUG, `🔍 [Raider.IO API] Request params: ${JSON.stringify(params)}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, { params });
      const duration = Date.now() - startTime;
      
      logger(LogLevel.INFO, `✅ [Raider.IO API] Character profile fetched successfully in ${duration}ms`);
      logger(LogLevel.DEBUG, `✅ [Raider.IO API] Response status: ${response.status}`);
      logger(LogLevel.DEBUG, `✅ [Raider.IO API] Response data keys: ${Object.keys(response.data || {}).join(', ')}`);
      
      if (response.data && response.data.name) {
        const mPlusScore = await this.getCurrentMythicPlusScore(response.data);
        const raidProgression = this.getRaidProgression(response.data);
        
        // Log available seasons for debugging
        if (response.data.mythicPlusScoresBySeason) {
          const seasons = response.data.mythicPlusScoresBySeason.map((s: any) => s.season);
          logger(LogLevel.DEBUG, `📊 [Raider.IO API] Available seasons: ${seasons.join(', ')}`);
        }
        
        logger(LogLevel.INFO, `📊 [Raider.IO API] Character ${characterName}: M+ Score: ${mPlusScore}, Raids: ${raidProgression.length}`);
        return response.data as RaiderIOCharacterProfile;
      }
      
      logger(LogLevel.WARN, `⚠️ [Raider.IO API] No character data found for ${characterName} on ${realm}-${region}`);
      return null;
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Raider.IO API] Error fetching character profile: ${(error as Error).message}`);
      if (axios.isAxiosError(error)) {
        logger(LogLevel.ERROR, `❌ [Raider.IO API] HTTP Status: ${error.response?.status}, Response: ${JSON.stringify(error.response?.data)}`);
      }
      return await ErrorHandlerService.handleApiError(
        'Raider.IO Character',
        error,
        null
      );
    }
  }

  /**
   * Get guild profile with member list
   */
  async getGuildProfile(region: string, realm: string, guildName: string): Promise<RaiderIOGuildProfile | null> {
    try {
      const url = `${this.baseUrl}/guilds/profile`;
      const params = {
        region: region.toLowerCase(),
        realm: realm.toLowerCase().replace(/\s+/g, '-'),
        name: guildName.toLowerCase(),
        fields: 'members'
      };

      logger(LogLevel.INFO, `🔍 [Raider.IO API] Fetching guild profile for ${guildName} on ${realm}-${region}`);
      logger(LogLevel.DEBUG, `🔍 [Raider.IO API] Request URL: ${url}`);
      logger(LogLevel.DEBUG, `🔍 [Raider.IO API] Request params: ${JSON.stringify(params)}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, { params });
      const duration = Date.now() - startTime;
      
      logger(LogLevel.INFO, `✅ [Raider.IO API] Guild profile fetched successfully in ${duration}ms`);
      logger(LogLevel.DEBUG, `✅ [Raider.IO API] Response status: ${response.status}`);
      
      if (response.data && response.data.name) {
        const memberCount = response.data.members?.length || 0;
        logger(LogLevel.INFO, `📊 [Raider.IO API] Guild ${guildName}: ${memberCount} members`);
        return response.data as RaiderIOGuildProfile;
      }
      
      logger(LogLevel.WARN, `⚠️ [Raider.IO API] No guild data found for ${guildName} on ${realm}-${region}`);
      return null;
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Raider.IO API] Error fetching guild profile: ${(error as Error).message}`);
      if (axios.isAxiosError(error)) {
        logger(LogLevel.ERROR, `❌ [Raider.IO API] HTTP Status: ${error.response?.status}, Response: ${JSON.stringify(error.response?.data)}`);
      }
      return await ErrorHandlerService.handleApiError(
        'Raider.IO Guild',
        error,
        null
      );
    }
  }

  /**
   * Get current mythic plus score from character profile
   */
  async getCurrentMythicPlusScore(profile: RaiderIOCharacterProfile): Promise<number> {
    try {
      // Get current season dynamically
      const currentSeasonId = await SeasonService.getCurrentSeasonId();
      
      if (currentSeasonId && profile.mythicPlusScoresBySeason) {
        const currentSeason = profile.mythicPlusScoresBySeason.find(season => 
          season.season === currentSeasonId
        );
        
        if (currentSeason) {
          logger(LogLevel.DEBUG, `📊 [Raider.IO API] Found score for season ${currentSeasonId}: ${currentSeason.scores?.all || 0}`);
          return currentSeason.scores?.all || 0;
        }
      }
      
      // Fallback: try to find any recent season with a score
      const fallbackSeason = profile.mythicPlusScoresBySeason?.find(season => 
        season.scores?.all && season.scores.all > 0
      );
      
      if (fallbackSeason) {
        logger(LogLevel.DEBUG, `📊 [Raider.IO API] Using fallback season ${fallbackSeason.season}: ${fallbackSeason.scores?.all || 0}`);
        return fallbackSeason.scores?.all || 0;
      }
      
      return 0;
    } catch (error) {
      logger(LogLevel.WARN, `⚠️ [Raider.IO API] Failed to get current season score: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get raid progression from character profile
   */
  getRaidProgression(profile: RaiderIOCharacterProfile): Array<{
    raidName: string;
    difficulty: string;
    bossesKilled: number;
    totalBosses: number;
  }> {
    const progression: Array<{
      raidName: string;
      difficulty: string;
      bossesKilled: number;
      totalBosses: number;
    }> = [];

    if (profile.raidProgression) {
      for (const [raidName, raidData] of Object.entries(profile.raidProgression)) {
        if (raidData.normalBossesKilled > 0) {
          progression.push({
            raidName,
            difficulty: 'Normal',
            bossesKilled: raidData.normalBossesKilled,
            totalBosses: raidData.totalBosses
          });
        }
        if (raidData.heroicBossesKilled > 0) {
          progression.push({
            raidName,
            difficulty: 'Heroic',
            bossesKilled: raidData.heroicBossesKilled,
            totalBosses: raidData.totalBosses
          });
        }
        if (raidData.mythicBossesKilled > 0) {
          progression.push({
            raidName,
            difficulty: 'Mythic',
            bossesKilled: raidData.mythicBossesKilled,
            totalBosses: raidData.totalBosses
          });
        }
      }
    }

    return progression;
  }
}

export const raiderIOAPI = new RaiderIOAPI();
