import axios from 'axios';
import _ from 'lodash';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { WowSeasonModel } from '../../models/wow-season';

interface BattleNetToken {
	access_token: string;
	token_type: string;
	expires_in: number;
}

interface WoWDungeon {
	id: number;
	name: string;
	slug: string;
}

interface MythicKeystoneSeason {
	id: number;
	start_timestamp: number;
	end_timestamp?: number;
	dungeons: WoWDungeon[];
}

/**
 * Service to interact with Battle.net API for WoW data
 */
export class BattleNetAPI {
	private clientId: string;
	private clientSecret: string;
	private region: string;
	private accessToken: string | null = null;
	private tokenExpiry: number = 0;

	constructor() {
		this.clientId = process.env.BATTLENET_CLIENT_ID || '';
		this.clientSecret = process.env.BATTLENET_CLIENT_SECRET || '';
		this.region = process.env.WOW_REGION || 'us';
	}

	/**
	 * Get OAuth access token from Battle.net
	 */
	private async getAccessToken(): Promise<string> {
		// Return cached token if still valid
		if (this.accessToken && Date.now() < this.tokenExpiry) {
			return this.accessToken;
		}

		try {
			const response = await axios.post(
				`https://${this.region}.battle.net/oauth/token`,
				'grant_type=client_credentials',
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
					},
				},
			);

			const token: BattleNetToken = response.data;
			this.accessToken = token.access_token;
			this.tokenExpiry = Date.now() + (token.expires_in * 1000) - 60000; // 1 minute buffer

			logger(LogLevel.INFO, 'Battle.net access token obtained successfully');
			return this.accessToken;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to get Battle.net access token: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * Get current Mythic Keystone season dungeons with smart caching
	 */
	async getCurrentSeasonDungeons(): Promise<WoWDungeon[]> {
		try {
			// Check if we have current season data in cache
			const cachedSeason = await this.getCurrentCachedSeason();
			if (cachedSeason && this.isSeasonStillValid(cachedSeason) && this.isDataFresh(cachedSeason)) {
				logger(LogLevel.INFO, `Using cached season data for season ${cachedSeason.seasonId} (last checked: ${cachedSeason.lastChecked})`);
				return cachedSeason.dungeons;
			}

			// Fetch fresh data from API - start with lightweight season check
			const token = await this.getAccessToken();
			const currentSeasonId = await this.getCurrentSeasonId(token);

			// If we have cached data for this season and it's recent, just update last checked
			if (cachedSeason && cachedSeason.seasonId === currentSeasonId && this.isSeasonStillValid(cachedSeason)) {
				logger(LogLevel.INFO, `Season ${currentSeasonId} unchanged, updating last checked date`);
				await this.updateLastChecked(currentSeasonId);
				return cachedSeason.dungeons;
			}

			// Only fetch full dungeon data if season changed or no cache exists
			logger(LogLevel.INFO, 'Season changed or no cache - fetching full dungeon data');
			return await this.fetchAndCacheSeasonData(token, currentSeasonId);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to fetch current season dungeons: ${(error as Error).message}`);

			// Fallback to cached data even if expired
			const cachedSeason = await this.getCurrentCachedSeason();
			if (cachedSeason) {
				logger(LogLevel.WARN, 'Using expired cached season data as fallback');
				return cachedSeason.dungeons;
			}

			return [];
		}
	}

	/**
	 * Get just the current season ID with minimal API call
	 */
	private async getCurrentSeasonId(token: string): Promise<number> {
		const response = await axios.get(
			`https://${this.region}.api.blizzard.com/data/wow/mythic-keystone/season/index`,
			{
				headers: { 'Authorization': `Bearer ${token}` },
				params: { namespace: `dynamic-${this.region}`, locale: 'en_US' },
			},
		);
		return response.data.current_season.id;
	}

	/**
	 * Fetch and cache full season data
	 */
	private async fetchAndCacheSeasonData(token: string, seasonId: number): Promise<WoWDungeon[]> {
		// Get season details
		const seasonDetailsResponse = await axios.get(
			`https://${this.region}.api.blizzard.com/data/wow/mythic-keystone/season/${seasonId}`,
			{
				headers: { 'Authorization': `Bearer ${token}` },
				params: { namespace: `dynamic-${this.region}`, locale: 'en_US' },
			},
		);

		const seasonData = seasonDetailsResponse.data;
		logger(LogLevel.DEBUG, `Season data structure: ${JSON.stringify(seasonData, null, 2)}`);

		// Try to get dungeons from the most recent period
		let dungeons: WoWDungeon[] = [];
		const periods = _.get(seasonData, 'periods', []);

		if (periods.length > 0) {
			// Get the most recent period
			const latestPeriod = periods[periods.length - 1];
			const periodId = _.get(latestPeriod, 'id');

			if (periodId) {
				logger(LogLevel.INFO, `Fetching dungeons from period ${periodId}`);
				try {
					const periodResponse = await axios.get(
						`https://${this.region}.api.blizzard.com/data/wow/mythic-keystone/period/${periodId}`,
						{
							headers: { 'Authorization': `Bearer ${token}` },
							params: { namespace: `dynamic-${this.region}`, locale: 'en_US' },
						},
					);

					const periodData = periodResponse.data;
					logger(LogLevel.DEBUG, `Period data structure: ${JSON.stringify(periodData, null, 2)}`);

					const dungeonsArray = _.get(periodData, 'dungeons', []);
					if (Array.isArray(dungeonsArray)) {
						dungeons = dungeonsArray.map((dungeon: any) => ({
							id: _.get(dungeon, 'dungeon.id') || _.get(dungeon, 'id'),
							name: _.get(dungeon, 'dungeon.name') || _.get(dungeon, 'name'),
							slug: _.get(dungeon, 'dungeon.slug') || _.get(dungeon, 'slug') || _.kebabCase(_.get(dungeon, 'dungeon.name') || _.get(dungeon, 'name')),
						})).filter(d => d.id && d.name);
					}
				}
				catch (periodError) {
					logger(LogLevel.WARN, `Failed to fetch period ${periodId}: ${(periodError as Error).message}`);
				}
			}
		}

		// If no dungeons from periods, use known War Within Season 3 dungeons
		if (dungeons.length === 0) {
			logger(LogLevel.INFO, 'Using hardcoded War Within Season 3 dungeon list');

			// War Within Season 3 dungeons from Wowhead
			const season3Dungeons = [
				{ name: 'Eco-Dome Al\'dani', slug: 'eco-dome-aldani' },
				{ name: 'Ara-Kara, City of Echoes', slug: 'ara-kara-city-of-echoes' },
				{ name: 'The Dawnbreaker', slug: 'the-dawnbreaker' },
				{ name: 'Operation: Floodgate', slug: 'operation-floodgate' },
				{ name: 'Priory of the Sacred Flame', slug: 'priory-of-the-sacred-flame' },
				{ name: 'Halls of Atonement', slug: 'halls-of-atonement' },
				{ name: 'Tazavesh: Streets of Wonder', slug: 'tazavesh-streets-of-wonder' },
				{ name: 'Tazavesh: So\'leah\'s Gambit', slug: 'tazavesh-soleahs-gambit' },
			];

			dungeons = season3Dungeons.map((dungeon, index) => ({
				id: 2000 + index, // Use fake IDs starting from 2000
				name: dungeon.name,
				slug: dungeon.slug,
			}));

			logger(LogLevel.INFO, `Using ${dungeons.length} hardcoded War Within Season 3 dungeons`);
		}

		// Store season data with timestamps
		await this.storeSeason({
			seasonId: seasonId,
			seasonName: _.get(seasonData, 'season_name', `Season ${seasonId}`),
			startDate: new Date(seasonData.start_timestamp),
			endDate: seasonData.end_timestamp ? new Date(seasonData.end_timestamp) : undefined,
			dungeons: dungeons,
			isActive: true,
		});

		logger(LogLevel.INFO, `Retrieved and cached ${dungeons.length} current season dungeons`);
		return dungeons;
	}

	/**
	 * Update just the last checked timestamp for existing season
	 */
	private async updateLastChecked(seasonId: number): Promise<void> {
		try {
			await WowSeasonModel.updateOne(
				{ seasonId: seasonId },
				{
					lastChecked: new Date(),
					lastUpdated: new Date(),
				},
			);
			logger(LogLevel.DEBUG, `Updated last checked timestamp for season ${seasonId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to update last checked: ${(error as Error).message}`);
		}
	}

	/**
	 * Get cached season data from database
	 */
	private async getCurrentCachedSeason() {
		try {
			return await WowSeasonModel.findOne({ isActive: true }).sort({ seasonId: -1 });
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to fetch cached season: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * Check if cached season is still valid
	 */
	private isSeasonStillValid(season: any): boolean {
		const now = new Date();

		// If season has no end date, consider it valid for 30 days from last update
		if (!season.endDate) {
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			return season.lastUpdated > thirtyDaysAgo;
		}

		// If season has end date, check if it's still active
		return season.endDate > now;
	}

	/**
	 * Check if cached data is fresh enough (checked within last 6 hours)
	 */
	private isDataFresh(season: any): boolean {
		if (!season.lastChecked) {
			return false;
		}

		const now = new Date();
		const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
		return new Date(season.lastChecked) > sixHoursAgo;
	}

	/**
	 * Store season data in database
	 */
	private async storeSeason(seasonData: {
		seasonId: number;
		seasonName: string;
		startDate: Date;
		endDate?: Date;
		dungeons: WoWDungeon[];
		isActive: boolean;
	}) {
		try {
			// Deactivate old seasons
			await WowSeasonModel.updateMany({ isActive: true }, { isActive: false });

			// Store new season
			await WowSeasonModel.findOneAndUpdate(
				{ seasonId: seasonData.seasonId },
				{
					...seasonData,
					lastUpdated: new Date(),
					lastChecked: new Date(),
				},
				{ upsert: true, new: true },
			);

			logger(LogLevel.INFO, `Stored season ${seasonData.seasonId} data in database`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to store season data: ${(error as Error).message}`);
		}
	}

	/**
	 * Get all available dungeons
	 */
	async getAllDungeons(): Promise<WoWDungeon[]> {
		try {
			const token = await this.getAccessToken();

			const response = await axios.get(
				`https://${this.region}.api.blizzard.com/data/wow/journal-instance/index`,
				{
					headers: { 'Authorization': `Bearer ${token}` },
					params: { namespace: `static-${this.region}`, locale: 'en_US' },
				},
			);

			logger(LogLevel.DEBUG, `Journal instances response: ${JSON.stringify(response.data, null, 2)}`);

			const instances = _.get(response.data, 'instances', []);
			if (!Array.isArray(instances)) {
				logger(LogLevel.ERROR, `Expected instances array, got: ${typeof instances}`);
				return [];
			}

			const dungeons: WoWDungeon[] = instances
				.filter((instance: any) => {
					const categoryType = _.get(instance, 'category.type');
					logger(LogLevel.DEBUG, `Instance ${instance.name}: category type = ${categoryType}`);
					return categoryType === 'DUNGEON';
				})
				.map((instance: any) => ({
					id: instance.id,
					name: instance.name,
					slug: _.get(instance, 'key.href', '').split('/').pop() || _.kebabCase(instance.name),
				}));

			logger(LogLevel.INFO, `Retrieved ${dungeons.length} total dungeons`);
			return dungeons;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Failed to fetch all dungeons: ${(error as Error).message}`);
			return [];
		}
	}
}

export const battleNetAPI = new BattleNetAPI();