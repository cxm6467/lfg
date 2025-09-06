import { AnalyticsService } from '../analytics/analytics-service';
import { PlayerStatsModel, GroupParticipationModel } from '../../models/analytics';
import { IPlayerStats } from '../../interfaces/IPlayerAnalytics';
import { MemberRole, DungeonType } from '../../enums';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';

interface IMatchingCriteria {
	guildId: string;
	dungeonType: DungeonType;
	requiredRoles: MemberRole[];
	minReliabilityScore?: number;
	preferredTime?: Date;
	maxGroupSize: number;
}

interface IMatchingResult {
	score: number;
	recommendedPlayers: IPlayerStats[];
	roleBalance: Record<MemberRole, number>;
	averageReliability: number;
	estimatedSuccessRate: number;
}

export class MatchingService {
	private static instance: MatchingService;
	private analyticsService: AnalyticsService;

	private constructor() {
		this.analyticsService = AnalyticsService.getInstance();
	}

	static getInstance(): MatchingService {
		if (!MatchingService.instance) {
			MatchingService.instance = new MatchingService();
		}
		return MatchingService.instance;
	}

	async findOptimalMatches(criteria: IMatchingCriteria, excludeUserIds: string[] = []): Promise<IMatchingResult> {
		try {
			const availablePlayers = await this.getAvailablePlayers(criteria, excludeUserIds);
			const compatibleGroups = await this.generateCompatibleGroups(availablePlayers, criteria);
			const bestMatch = await this.selectBestMatch(compatibleGroups, criteria);

			return bestMatch;
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error finding optimal matches: ${config.sanitizeForLogging(error)}`);
			return this.getEmptyResult();
		}
	}

	private async getAvailablePlayers(criteria: IMatchingCriteria, excludeUserIds: string[]): Promise<IPlayerStats[]> {
		const query: any = {
			guildId: criteria.guildId,
			userId: { $nin: excludeUserIds },
			lastActive: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
		};

		if (criteria.minReliabilityScore) {
			query.reliabilityScore = { $gte: criteria.minReliabilityScore };
		}

		const players = await PlayerStatsModel.find(query).exec();

		return players.filter(player => 
			this.hasRequiredRoleAvailability(player, criteria.requiredRoles) &&
			this.hasDungeonExperience(player, criteria.dungeonType)
		);
	}

	private hasRequiredRoleAvailability(player: IPlayerStats, requiredRoles: MemberRole[]): boolean {
		return requiredRoles.some(role => player.preferredRoles.includes(role));
	}

	private hasDungeonExperience(player: IPlayerStats, dungeonType: DungeonType): boolean {
		return player.preferredDungeonTypes.includes(dungeonType) || player.totalGroupsJoined > 5;
	}

	private async generateCompatibleGroups(players: IPlayerStats[], criteria: IMatchingCriteria): Promise<IPlayerStats[][]> {
		const groups: IPlayerStats[][] = [];
		const maxCombinations = 50;

		for (let i = 0; i < Math.min(maxCombinations, players.length); i++) {
			const group = await this.buildCompatibleGroup(players, criteria, i);
			if (group.length >= 2 && group.length <= criteria.maxGroupSize) {
				groups.push(group);
			}
		}

		return groups.sort((a, b) => this.calculateGroupScore(b, criteria) - this.calculateGroupScore(a, criteria));
	}

	private async buildCompatibleGroup(players: IPlayerStats[], criteria: IMatchingCriteria, startIndex: number): Promise<IPlayerStats[]> {
		const group: IPlayerStats[] = [];
		const rolesFilled: Record<MemberRole, number> = {} as Record<MemberRole, number>;
		
		Object.values(MemberRole).forEach(role => {
			rolesFilled[role] = 0;
		});

		let currentPlayer = players[startIndex];
		if (!currentPlayer) return group;

		group.push(currentPlayer);
		const bestRole = this.getBestRoleForPlayer(currentPlayer, criteria.requiredRoles);
		if (bestRole) {
			rolesFilled[bestRole]++;
		}

		for (const player of players) {
			if (group.includes(player) || group.length >= criteria.maxGroupSize) continue;

			const compatibility = await this.calculateAverageCompatibility(player, group);
			const roleNeeded = this.getMostNeededRole(rolesFilled, criteria.requiredRoles);
			
			if (compatibility >= 60 && 
				player.preferredRoles.includes(roleNeeded) &&
				this.isTimeCompatible(player, criteria.preferredTime)) {
				
				group.push(player);
				rolesFilled[roleNeeded]++;
			}
		}

		return group;
	}

	private getBestRoleForPlayer(player: IPlayerStats, requiredRoles: MemberRole[]): MemberRole | null {
		for (const role of player.preferredRoles) {
			if (requiredRoles.includes(role)) {
				return role;
			}
		}
		return player.preferredRoles[0] || null;
	}

	private getMostNeededRole(rolesFilled: Record<MemberRole, number>, requiredRoles: MemberRole[]): MemberRole {
		let minCount = Infinity;
		let mostNeeded = requiredRoles[0];

		for (const role of requiredRoles) {
			if (rolesFilled[role] < minCount) {
				minCount = rolesFilled[role];
				mostNeeded = role;
			}
		}

		return mostNeeded;
	}

	private async calculateAverageCompatibility(player: IPlayerStats, group: IPlayerStats[]): Promise<number> {
		if (group.length === 0) return 50;

		const compatibilities = await Promise.all(
			group.map(groupMember => 
				this.analyticsService.calculatePlayerCompatibility(player.userId, groupMember.userId, player.guildId)
			)
		);

		return compatibilities.reduce((sum, score) => sum + score, 0) / compatibilities.length;
	}

	private isTimeCompatible(player: IPlayerStats, preferredTime?: Date): boolean {
		if (!preferredTime) return true;

		const hour = preferredTime.getHours();
		const dayOfWeek = preferredTime.getDay();

		return player.preferredPlayTimes.includes(hour) || 
			   player.preferredDaysOfWeek.includes(dayOfWeek) ||
			   player.preferredPlayTimes.length === 0;
	}

	private calculateGroupScore(group: IPlayerStats[], criteria: IMatchingCriteria): number {
		if (group.length === 0) return 0;

		const avgReliability = group.reduce((sum, p) => sum + p.reliabilityScore, 0) / group.length;
		const avgLeadership = group.reduce((sum, p) => sum + p.leadershipScore, 0) / group.length;
		const avgTeamwork = group.reduce((sum, p) => sum + p.teamworkScore, 0) / group.length;

		const roleBalance = this.calculateRoleBalance(group, criteria.requiredRoles);
		const experienceBonus = this.calculateExperienceBonus(group, criteria.dungeonType);

		return (avgReliability * 0.3) + 
			   (avgLeadership * 0.2) + 
			   (avgTeamwork * 0.2) + 
			   (roleBalance * 0.2) + 
			   (experienceBonus * 0.1);
	}

	private calculateRoleBalance(group: IPlayerStats[], requiredRoles: MemberRole[]): number {
		const roleCount: Record<MemberRole, number> = {} as Record<MemberRole, number>;
		Object.values(MemberRole).forEach(role => {
			roleCount[role] = 0;
		});

		group.forEach(player => {
			const bestRole = this.getBestRoleForPlayer(player, requiredRoles);
			if (bestRole) {
				roleCount[bestRole]++;
			}
		});

		const totalRequired = requiredRoles.length;
		const filled = requiredRoles.filter(role => roleCount[role] > 0).length;

		return (filled / totalRequired) * 100;
	}

	private calculateExperienceBonus(group: IPlayerStats[], dungeonType: DungeonType): number {
		const experiencedPlayers = group.filter(player => 
			player.preferredDungeonTypes.includes(dungeonType) && 
			player.totalGroupsCompleted > 10
		).length;

		return (experiencedPlayers / group.length) * 100;
	}

	private async selectBestMatch(groups: IPlayerStats[][], criteria: IMatchingCriteria): Promise<IMatchingResult> {
		if (groups.length === 0) return this.getEmptyResult();

		const bestGroup = groups[0];
		const score = this.calculateGroupScore(bestGroup, criteria);
		
		const roleBalance: Record<MemberRole, number> = {} as Record<MemberRole, number>;
		Object.values(MemberRole).forEach(role => {
			roleBalance[role] = 0;
		});

		bestGroup.forEach(player => {
			const bestRole = this.getBestRoleForPlayer(player, criteria.requiredRoles);
			if (bestRole) {
				roleBalance[bestRole]++;
			}
		});

		const averageReliability = bestGroup.reduce((sum, p) => sum + p.reliabilityScore, 0) / bestGroup.length;
		const estimatedSuccessRate = await this.calculateSuccessRate(bestGroup, criteria.dungeonType);

		return {
			score,
			recommendedPlayers: bestGroup,
			roleBalance,
			averageReliability,
			estimatedSuccessRate,
		};
	}

	private async calculateSuccessRate(group: IPlayerStats[], dungeonType: DungeonType): Promise<number> {
		const avgReliability = group.reduce((sum, p) => sum + p.reliabilityScore, 0) / group.length;
		const avgExperience = group.reduce((sum, p) => sum + p.totalGroupsCompleted, 0) / group.length;

		const experienceBonus = Math.min(avgExperience / 50, 1) * 20;
		const reliabilityBonus = (avgReliability / 100) * 60;

		const dungeonExperienceBonus = group.filter(p => 
			p.preferredDungeonTypes.includes(dungeonType)
		).length / group.length * 20;

		return Math.min(reliabilityBonus + experienceBonus + dungeonExperienceBonus, 95);
	}

	private getEmptyResult(): IMatchingResult {
		return {
			score: 0,
			recommendedPlayers: [],
			roleBalance: {} as Record<MemberRole, number>,
			averageReliability: 0,
			estimatedSuccessRate: 0,
		};
	}

	async findPlayerRecommendations(userId: string, guildId: string, limit: number = 5): Promise<IPlayerStats[]> {
		try {
			return await this.analyticsService.getPlayerRecommendations(userId, guildId, limit);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error finding player recommendations: ${config.sanitizeForLogging(error)}`);
			return [];
		}
	}

	async suggestGroupComposition(dungeonType: DungeonType, guildId: string): Promise<{
		recommendedRoles: MemberRole[];
		minGroupSize: number;
		maxGroupSize: number;
		estimatedDuration: number;
	}> {
		try {
			const recentGroups = await GroupParticipationModel
				.find({ 
					guildId, 
					dungeonType, 
					wasSuccessful: true,
					joinedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
				})
				.populate('userId')
				.exec();

			const roleFrequency: Record<MemberRole, number> = {} as Record<MemberRole, number>;
			Object.values(MemberRole).forEach(role => {
				roleFrequency[role] = 0;
			});

			let totalDuration = 0;
			const groupSizes: number[] = [];

			recentGroups.forEach(participation => {
				roleFrequency[participation.role]++;
				if (participation.durationMinutes) {
					totalDuration += participation.durationMinutes;
				}
			});

			const avgDuration = totalDuration > 0 ? Math.round(totalDuration / recentGroups.length) : 120;

			const recommendedRoles = Object.entries(roleFrequency)
				.sort(([,a], [,b]) => b - a)
				.slice(0, 4)
				.map(([role]) => role as MemberRole);

			return {
				recommendedRoles,
				minGroupSize: 3,
				maxGroupSize: 5,
				estimatedDuration: avgDuration,
			};
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error suggesting group composition: ${config.sanitizeForLogging(error)}`);
			return {
				recommendedRoles: [MemberRole.Tank, MemberRole.Healer, MemberRole.Dps],
				minGroupSize: 3,
				maxGroupSize: 5,
				estimatedDuration: 120,
			};
		}
	}
}