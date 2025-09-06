import { Document } from 'mongoose';
import { MemberRole, DungeonType } from '../enums';

export interface IPlayerStats extends Document {
	userId: string;
	guildId: string;
	username: string;
	discriminator?: string;
	totalGroupsJoined: number;
	totalGroupsCompleted: number;
	totalGroupsCreated: number;
	totalNoShows: number;
	averageRating: number;
	preferredRoles: MemberRole[];
	preferredDungeonTypes: DungeonType[];
	preferredPlayTimes: number[];
	preferredDaysOfWeek: number[];
	lastActive: Date;
	joinDate: Date;
	totalPlayTimeHours: number;
	achievements: string[];
	reliabilityScore: number;
	leadershipScore: number;
	teamworkScore: number;
	punctualityScore: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface IGroupParticipation extends Document {
	groupId: string;
	eventId?: string;
	userId: string;
	guildId: string;
	role: MemberRole;
	joinedAt: Date;
	leftAt?: Date;
	completedAt?: Date;
	wasCreator: boolean;
	wasNoShow: boolean;
	rating?: number;
	feedback?: string;
	dungeonType: DungeonType;
	dungeonName: string;
	dungeonLevel?: string;
	durationMinutes?: number;
	wasSuccessful: boolean;
}

export interface IRating extends Document {
	raterId: string;
	ratedUserId: string;
	groupId: string;
	guildId: string;
	rating: number;
	categories: {
		reliability: number;
		leadership: number;
		teamwork: number;
		punctuality: number;
	};
	comment?: string;
	isAnonymous: boolean;
	createdAt: Date;
}

export interface IGuildAnalytics extends Document {
	guildId: string;
	totalGroups: number;
	totalEvents: number;
	totalActiveUsers: number;
	averageGroupSize: number;
	mostPopularDungeons: Array<{
		name: string;
		count: number;
		successRate: number;
	}>;
	mostActiveUsers: Array<{
		userId: string;
		groupCount: number;
		reliabilityScore: number;
	}>;
	activityByHour: number[];
	activityByDay: number[];
	completionRates: {
		overall: number;
		byDungeonType: Record<string, number>;
		byRole: Record<string, number>;
	};
	averageRatings: {
		overall: number;
		byRole: Record<string, number>;
	};
	lastUpdated: Date;
}

export interface IPlayerCompatibility {
	userId1: string;
	userId2: string;
	guildId: string;
	compatibilityScore: number;
	groupsTogetherCount: number;
	successfulGroupsCount: number;
	averageRating: number;
	communicationScore: number;
	roleCompatibility: number;
	playTimeCompatibility: number;
	lastPlayedTogether: Date;
}