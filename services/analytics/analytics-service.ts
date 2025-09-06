import { PlayerStatsModel, GroupParticipationModel, RatingModel, GuildAnalyticsModel, PlayerCompatibilityModel } from '../../models/analytics';
import { IPlayerStats, IGroupParticipation, IRating, IGuildAnalytics } from '../../interfaces/IPlayerAnalytics';
import { MemberRole, DungeonType } from '../../enums';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';

export class AnalyticsService {
	private static instance: AnalyticsService;

	private constructor() {
		// Empty constructor
	}

	static getInstance(): AnalyticsService {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	async trackGroupParticipation(participationData: Partial<IGroupParticipation>): Promise<void> {
		try {
			const participation = new GroupParticipationModel(participationData);
			await participation.save();

			await this.updatePlayerStats(participationData.userId!, participationData.guildId!, {
				joinedGroup: true,
				completed: !!participationData.completedAt,
				noShow: !!participationData.wasNoShow,
				created: !!participationData.wasCreator,
				role: participationData.role!,
				dungeonType: participationData.dungeonType!,
				playTime: participationData.joinedAt!,
			});

			logger(LogLevel.INFO, `Tracked group participation: ${participationData.userId} in ${participationData.groupId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error tracking group participation: ${config.sanitizeForLogging(error)}`);
		}
	}

	async updatePlayerStats(userId: string, guildId: string, activity: {
		joinedGroup?: boolean;
		completed?: boolean;
		noShow?: boolean;
		created?: boolean;
		role?: MemberRole;
		dungeonType?: DungeonType;
		playTime?: Date;
	}): Promise<void> {
		try {
			const stats = await PlayerStatsModel.findOneAndUpdate(
				{ userId, guildId },
				{},
				{ upsert: true, new: true, setDefaultsOnInsert: true },
			);

			if (activity.joinedGroup) {
				stats.totalGroupsJoined += 1;
				stats.lastActive = new Date();
			}

			if (activity.completed) {
				stats.totalGroupsCompleted += 1;
				stats.totalPlayTimeHours += 2;
			}

			if (activity.noShow) {
				stats.totalNoShows += 1;
				stats.reliabilityScore = Math.max(0, stats.reliabilityScore - 5);
			}

			if (activity.created) {
				stats.totalGroupsCreated += 1;
				stats.leadershipScore = Math.min(100, stats.leadershipScore + 2);
			}

			if (activity.role && !stats.preferredRoles.includes(activity.role)) {
				stats.preferredRoles.push(activity.role);
			}

			if (activity.dungeonType && !stats.preferredDungeonTypes.includes(activity.dungeonType)) {
				stats.preferredDungeonTypes.push(activity.dungeonType);
			}

			if (activity.playTime) {
				const hour = activity.playTime.getHours();
				const dayOfWeek = activity.playTime.getDay();

				if (!stats.preferredPlayTimes.includes(hour)) {
					stats.preferredPlayTimes.push(hour);
				}
				if (!stats.preferredDaysOfWeek.includes(dayOfWeek)) {
					stats.preferredDaysOfWeek.push(dayOfWeek);
				}
			}

			const totalActivities = stats.totalGroupsJoined;
			if (totalActivities > 0) {
				const completionRate = stats.totalGroupsCompleted / totalActivities;
				const noShowRate = stats.totalNoShows / totalActivities;
				stats.reliabilityScore = Math.round((completionRate * 70) + ((1 - noShowRate) * 30));
			}

			await stats.save();

		}
		catch (error) {
			logger(LogLevel.ERROR, `Error updating player stats: ${config.sanitizeForLogging(error)}`);
		}
	}

	async getPlayerStats(userId: string, guildId: string): Promise<IPlayerStats | null> {
		try {
			return await PlayerStatsModel.findOne({ userId, guildId });
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error getting player stats: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	async getTopPlayers(guildId: string, metric: 'reliability' | 'groups' | 'leadership', limit: number = 10): Promise<IPlayerStats[]> {
		try {
			let sortField: string;
			switch (metric) {
			case 'reliability':
				sortField = 'reliabilityScore';
				break;
			case 'groups':
				sortField = 'totalGroupsJoined';
				break;
			case 'leadership':
				sortField = 'leadershipScore';
				break;
			default:
				sortField = 'reliabilityScore';
			}

			return await PlayerStatsModel
				.find({ guildId })
				.sort({ [sortField]: -1 })
				.limit(limit)
				.exec();
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error getting top players: ${config.sanitizeForLogging(error)}`);
			return [];
		}
	}

	async calculatePlayerCompatibility(userId1: string, userId2: string, guildId: string): Promise<number> {
		try {
			const user1Groups = await GroupParticipationModel.find({ userId: userId1, guildId }).select('groupId');
			const user2Groups = await GroupParticipationModel.find({ userId: userId2, guildId }).select('groupId');

			const user1GroupIds = user1Groups.map(g => g.groupId);
			const user2GroupIds = user2Groups.map(g => g.groupId);
			const sharedGroups = user1GroupIds.filter(id => user2GroupIds.includes(id));

			if (sharedGroups.length === 0) {
				return 50;
			}

			const [stats1, stats2] = await Promise.all([
				PlayerStatsModel.findOne({ userId: userId1, guildId }),
				PlayerStatsModel.findOne({ userId: userId2, guildId }),
			]);

			if (!stats1 || !stats2) {
				return 50;
			}

			const reliabilityCompatibility = 100 - Math.abs(stats1.reliabilityScore - stats2.reliabilityScore);
			const roleCompatibility = this.calculateRoleCompatibility(stats1.preferredRoles, stats2.preferredRoles);
			const playTimeCompatibility = this.calculatePlayTimeCompatibility(
				stats1.preferredPlayTimes,
				stats2.preferredPlayTimes,
			);

			const sharedParticipations = await GroupParticipationModel.find({
				groupId: { $in: sharedGroups },
				userId: { $in: [userId1, userId2] },
			});

			const successfulTogether = sharedParticipations.filter(p => p.wasSuccessful).length;
			const successRate = (successfulTogether / sharedParticipations.length) * 100;

			const compatibilityScore = (
				reliabilityCompatibility * 0.3 +
				roleCompatibility * 0.25 +
				playTimeCompatibility * 0.25 +
				successRate * 0.2
			);

			await PlayerCompatibilityModel.findOneAndUpdate(
				{
					$or: [
						{ userId1, userId2, guildId },
						{ userId1: userId2, userId2: userId1, guildId },
					],
				},
				{
					userId1: userId1 < userId2 ? userId1 : userId2,
					userId2: userId1 < userId2 ? userId2 : userId1,
					guildId,
					compatibilityScore,
					groupsTogetherCount: sharedGroups.length,
					successfulGroupsCount: successfulTogether / 2,
					lastPlayedTogether: new Date(),
				},
				{ upsert: true },
			);

			return Math.round(compatibilityScore);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error calculating player compatibility: ${config.sanitizeForLogging(error)}`);
			return 50;
		}
	}

	private calculateRoleCompatibility(roles1: MemberRole[], roles2: MemberRole[]): number {
		const overlap = roles1.filter(role => roles2.includes(role));
		const totalRoles = new Set([...roles1, ...roles2]).size;

		if (totalRoles === 0) return 50;

		const overlapRate = overlap.length / totalRoles;
		return (1 - overlapRate) * 100;
	}

	private calculatePlayTimeCompatibility(times1: number[], times2: number[]): number {
		if (times1.length === 0 || times2.length === 0) return 50;

		const overlap = times1.filter(time => times2.includes(time));
		const maxPossible = Math.min(times1.length, times2.length);

		if (maxPossible === 0) return 50;

		return (overlap.length / maxPossible) * 100;
	}

	async getPlayerRecommendations(userId: string, guildId: string, limit: number = 5): Promise<IPlayerStats[]> {
		try {
			const userStats = await PlayerStatsModel.findOne({ userId, guildId });
			if (!userStats) return [];

			const compatibilities = await PlayerCompatibilityModel
				.find({
					$or: [
						{ userId1: userId, guildId },
						{ userId2: userId, guildId },
					],
				})
				.sort({ compatibilityScore: -1 })
				.limit(limit * 2);

			const recommendedUserIds = compatibilities.map(c =>
				c.userId1 === userId ? c.userId2 : c.userId1,
			);

			return await PlayerStatsModel
				.find({
					userId: { $in: recommendedUserIds },
					guildId,
					lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
				})
				.limit(limit)
				.exec();
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error getting player recommendations: ${config.sanitizeForLogging(error)}`);
			return [];
		}
	}
}