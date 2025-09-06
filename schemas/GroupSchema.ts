import { Schema, Model } from 'mongoose';
import { IDungeon, IMember, IGroup } from '../interfaces';
import { DungeonName, DungeonType, MemberRole } from '../enums';


export const DungeonSchema = new Schema<IDungeon, Model<IDungeon>>({
	name: { type: String, required: true }, // Removed enum constraint for dynamic dungeons
	type: { type: String, required: true, enum: DungeonType },
	level: { type: String, required: false },
	thumbnail: { type: String, required: false },
}, { collection: 'dungeon', timestamps: true });

export const MemberSchema = new Schema<IMember, Model<IMember>>({
	userId: { type: String, required: false },
	role: { type: String, enum: MemberRole },
	hasLust: { type: Boolean },
	hasBres: { type: Boolean },
}, { collection: 'member', timestamps: true });

export const GroupSchema = new Schema<IGroup, Model<IGroup>>({
	groupId: { type: String, required: true },
	groupName: { type: String, required: true },
	dungeon: DungeonSchema,
	members: { type: [MemberSchema] },
	channelId: { type: String },
	guildId: { type: String },
	threadId: { type: String },
	messageId: { type: String },
	notes: { type: String },
	embedId: { type: String },
	voiceChannelId: { type: String },
	warningMessageSent: { type: Boolean, default: false },
	startTime: { type: Date },
	archived: { type: Boolean, default: false },
	archivedAt: { type: Date },
	archivedBy: { type: String },
	archivedReason: { type: String },
	cleanedUp: { type: Boolean, default: false },
	cleanedUpAt: { type: Date },
	cleanedUpBy: { type: String },
}, { collection: 'group', timestamps: true });
