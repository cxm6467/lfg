import axios from 'axios';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { SeasonModel } from '../../models/season';
import { ISeason } from '../../interfaces/ISeason';
import { ErrorHandlerService } from '../error/error-handler-service';

/**
 * Service to manage current season detection and caching
 */
export class SeasonService {
  private static readonly SEASON_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly RAIDER_IO_SEASONS_URL = 'https://raider.io/api/v1/seasons';

  /**
   * Get the current season ID, fetching from API if needed
   */
  static async getCurrentSeasonId(): Promise<string | null> {
    try {
      // First, try to get from database
      const cachedSeason = await this.getCachedCurrentSeason();
      
      if (cachedSeason && this.isSeasonCacheValid(cachedSeason)) {
        logger(LogLevel.DEBUG, `📅 [Season Service] Using cached current season: ${cachedSeason.seasonId}`);
        return cachedSeason.seasonId;
      }

      // Cache is invalid or doesn't exist, fetch from API
      logger(LogLevel.INFO, `🔄 [Season Service] Fetching current season from Raider.IO API...`);
      const currentSeason = await this.fetchCurrentSeasonFromAPI();
      
      if (currentSeason) {
        await this.updateSeasonCache(currentSeason);
        logger(LogLevel.INFO, `✅ [Season Service] Updated current season: ${currentSeason.seasonId}`);
        return currentSeason.seasonId;
      }

      // Fallback to hardcoded season if API fails
      logger(LogLevel.WARN, `⚠️ [Season Service] API failed, using fallback season`);
      return this.getFallbackSeasonId();
      
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Season Service] Failed to get current season: ${(error as Error).message}`);
      return this.getFallbackSeasonId();
    }
  }

  /**
   * Get cached current season from database
   */
  private static async getCachedCurrentSeason(): Promise<ISeason | null> {
    try {
      return await SeasonModel.findOne({ isCurrent: true }).sort({ lastUpdated: -1 });
    } catch (error) {
      logger(LogLevel.WARN, `⚠️ [Season Service] Failed to get cached season: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Check if cached season is still valid
   */
  private static isSeasonCacheValid(season: ISeason): boolean {
    const now = Date.now();
    const lastUpdated = season.lastUpdated.getTime();
    const age = now - lastUpdated;
    
    const isValid = age < this.SEASON_CACHE_DURATION;
    
    if (!isValid) {
      logger(LogLevel.INFO, `📅 [Season Service] Season cache expired (age: ${Math.round(age / 1000 / 60)} minutes)`);
    }
    
    return isValid;
  }

  /**
   * Fetch current season from Raider.IO API
   */
  private static async fetchCurrentSeasonFromAPI(): Promise<ISeason | null> {
    try {
      const response = await axios.get(this.RAIDER_IO_SEASONS_URL);
      
      if (response.data && response.data.seasons) {
        // Find the current season (usually the first one or marked as current)
        const currentSeason = response.data.seasons.find((season: any) => 
          season.current || season.active || season.id.includes('current')
        ) || response.data.seasons[0]; // Fallback to first season

        if (currentSeason) {
          return {
            seasonId: currentSeason.id,
            seasonName: currentSeason.name || currentSeason.id,
            isCurrent: true,
            startDate: currentSeason.startDate ? new Date(currentSeason.startDate) : undefined,
            endDate: currentSeason.endDate ? new Date(currentSeason.endDate) : undefined,
            lastUpdated: new Date()
          };
        }
      }

      logger(LogLevel.WARN, `⚠️ [Season Service] No current season found in API response`);
      return null;
      
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Season Service] Failed to fetch season from API: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Update season cache in database
   */
  private static async updateSeasonCache(season: ISeason): Promise<void> {
    try {
      // Mark all other seasons as not current
      await SeasonModel.updateMany({}, { isCurrent: false });
      
      // Upsert the current season
      await SeasonModel.findOneAndUpdate(
        { seasonId: season.seasonId },
        season,
        { upsert: true, new: true }
      );
      
      logger(LogLevel.DEBUG, `💾 [Season Service] Updated season cache: ${season.seasonId}`);
      
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Season Service] Failed to update season cache: ${(error as Error).message}`);
    }
  }

  /**
   * Get fallback season ID when API is unavailable
   */
  private static getFallbackSeasonId(): string {
    // Try to determine current season based on date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-based to 1-based
    
    // Rough estimation based on typical WoW season patterns
    if (year >= 2024 && month >= 8) {
      return 'season-tww-3'; // The War Within Season 3
    } else if (year >= 2024 && month >= 4) {
      return 'season-tww-2'; // The War Within Season 2
    } else if (year >= 2024) {
      return 'season-tww-1'; // The War Within Season 1
    } else {
      return 'season-df-3'; // Dragonflight Season 3 (fallback)
    }
  }

  /**
   * Force refresh the current season (admin command)
   */
  static async forceRefreshCurrentSeason(): Promise<string | null> {
    logger(LogLevel.INFO, `🔄 [Season Service] Force refreshing current season...`);
    
    try {
      const currentSeason = await this.fetchCurrentSeasonFromAPI();
      
      if (currentSeason) {
        await this.updateSeasonCache(currentSeason);
        logger(LogLevel.INFO, `✅ [Season Service] Force refreshed current season: ${currentSeason.seasonId}`);
        return currentSeason.seasonId;
      }
      
      return null;
    } catch (error) {
      logger(LogLevel.ERROR, `❌ [Season Service] Failed to force refresh season: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get season information for display
   */
  static async getSeasonInfo(): Promise<{
    currentSeasonId: string;
    isFromCache: boolean;
    lastUpdated?: Date;
    seasonName?: string;
  }> {
    const cachedSeason = await this.getCachedCurrentSeason();
    const currentSeasonId = await this.getCurrentSeasonId();
    
    return {
      currentSeasonId: currentSeasonId || 'unknown',
      isFromCache: cachedSeason ? this.isSeasonCacheValid(cachedSeason) : false,
      lastUpdated: cachedSeason?.lastUpdated,
      seasonName: cachedSeason?.seasonName
    };
  }
}
