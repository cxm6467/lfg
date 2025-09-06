import { Schema, Model } from 'mongoose';
import { IPlayerStats, IGroupParticipation, IRating, IGuildAnalytics, IPlayerCompatibility } from '../interfaces/IPlayerAnalytics';
import { MemberRole, DungeonType } from '../enums';

export const PlayerStatsSchema = new Schema<IPlayerStats, Model<IPlayerStats>>({
	userId: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	username: { type: String, required: true },
	discriminator: { type: String },
	totalGroupsJoined: { type: Number, default: 0, index: true },
	totalGroupsCompleted: { type: Number, default: 0 },
	totalGroupsCreated: { type: Number, default: 0 },
	totalNoShows: { type: Number, default: 0 },
	averageRating: { type: Number, default: 0, min: 0, max: 5 },
	preferredRoles: [{ type: String, enum: Object.values(MemberRole) }],
	preferredDungeonTypes: [{ type: String, enum: Object.values(DungeonType) }],
	preferredPlayTimes: [{ type: Number, min: 0, max: 23 }],
	preferredDaysOfWeek: [{ type: Number, min: 0, max: 6 }],
	lastActive: { type: Date, default: Date.now, index: true },
	joinDate: { type: Date, default: Date.now },
	totalPlayTimeHours: { type: Number, default: 0 },
	achievements: [{ type: String }],
	reliabilityScore: { type: Number, default: 50, min: 0, max: 100, index: true },
	leadershipScore: { type: Number, default: 50, min: 0, max: 100 },
	teamworkScore: { type: Number, default: 50, min: 0, max: 100 },
	punctualityScore: { type: Number, default: 50, min: 0, max: 100 },
}, { collection: 'player_stats', timestamps: true });

export const GroupParticipationSchema = new Schema<IGroupParticipation, Model<IGroupParticipation>>({
	groupId: { type: String, required: true, index: true },
	eventId: { type: String, index: true },
	userId: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	role: { type: String, enum: Object.values(MemberRole), required: true },
	joinedAt: { type: Date, required: true, index: true },
	leftAt: { type: Date },
	completedAt: { type: Date },
	wasCreator: { type: Boolean, default: false },
	wasNoShow: { type: Boolean, default: false },
	rating: { type: Number, min: 1, max: 5 },
	feedback: { type: String, maxlength: 500 },
	dungeonType: { type: String, enum: Object.values(DungeonType), required: true },
	dungeonName: { type: String, required: true },
	dungeonLevel: { type: String },
	durationMinutes: { type: Number, min: 0 },
	wasSuccessful: { type: Boolean, default: false, index: true },
}, { collection: 'group_participation', timestamps: true });

export const RatingSchema = new Schema<IRating, Model<IRating>>({
	raterId: { type: String, required: true, index: true },
	ratedUserId: { type: String, required: true, index: true },
	groupId: { type: String, required: true },
	guildId: { type: String, required: true, index: true },
	rating: { type: Number, required: true, min: 1, max: 5 },
	categories: {
		reliability: { type: Number, required: true, min: 1, max: 5 },
		leadership: { type: Number, required: true, min: 1, max: 5 },
		teamwork: { type: Number, required: true, min: 1, max: 5 },
		punctuality: { type: Number, required: true, min: 1, max: 5 },
	},
	comment: { type: String, maxlength: 500 },
	isAnonymous: { type: Boolean, default: false },
}, { collection: 'ratings', timestamps: true });

export const GuildAnalyticsSchema = new Schema<IGuildAnalytics, Model<IGuildAnalytics>>({
	guildId: { type: String, required: true, unique: true, index: true },
	totalGroups: { type: Number, default: 0 },
	totalEvents: { type: Number, default: 0 },
	totalActiveUsers: { type: Number, default: 0 },
	averageGroupSize: { type: Number, default: 0 },
	mostPopularDungeons: [{
		name: { type: String, required: true },
		count: { type: Number, required: true },
		successRate: { type: Number, required: true, min: 0, max: 100 },
	}],
	mostActiveUsers: [{
		userId: { type: String, required: true },
		groupCount: { type: Number, required: true },
		reliabilityScore: { type: Number, required: true },
	}],
	activityByHour: { type: [Number], default: new Array(24).fill(0) },
	activityByDay: { type: [Number], default: new Array(7).fill(0) },
	completionRates: {
		overall: { type: Number, default: 0, min: 0, max: 100 },
		byDungeonType: { type: Map, of: Number },
		byRole: { type: Map, of: Number },
	},
	averageRatings: {
		overall: { type: Number, default: 0, min: 0, max: 5 },
		byRole: { type: Map, of: Number },
	},
	lastUpdated: { type: Date, default: Date.now },
}, { collection: 'guild_analytics', timestamps: false });

export const PlayerCompatibilitySchema = new Schema<IPlayerCompatibility, Model<IPlayerCompatibility>>({
	userId1: { type: String, required: true, index: true },
	userId2: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	compatibilityScore: { type: Number, required: true, min: 0, max: 100, index: true },
	groupsTogetherCount: { type: Number, default: 0 },
	successfulGroupsCount: { type: Number, default: 0 },
	averageRating: { type: Number, default: 0, min: 0, max: 5 },
	communicationScore: { type: Number, default: 50, min: 0, max: 100 },
	roleCompatibility: { type: Number, default: 50, min: 0, max: 100 },
	playTimeCompatibility: { type: Number, default: 50, min: 0, max: 100 },
	lastPlayedTogether: { type: Date, index: true },
}, { collection: 'player_compatibility', timestamps: true });

PlayerStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });
PlayerStatsSchema.index({ guildId: 1, reliabilityScore: -1 });
PlayerStatsSchema.index({ guildId: 1, totalGroupsJoined: -1 });

GroupParticipationSchema.index({ guildId: 1, userId: 1, joinedAt: -1 });
GroupParticipationSchema.index({ guildId: 1, dungeonType: 1, wasSuccessful: 1 });

RatingSchema.index({ raterId: 1, ratedUserId: 1, groupId: 1 }, { unique: true });
RatingSchema.index({ guildId: 1, ratedUserId: 1, createdAt: -1 });

PlayerCompatibilitySchema.index({ userId1: 1, userId2: 1, guildId: 1 }, { unique: true });
PlayerCompatibilitySchema.index({ guildId: 1, compatibilityScore: -1 });