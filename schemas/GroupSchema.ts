import { Schema, Model } from 'mongoose';
import { IDungeon, IMember, IGroup } from '../interfaces';
import { DungeonName, DungeonType, MemberRole } from '../enums';


export const DungeonSchema = new Schema<IDungeon, Model<IDungeon>>({
	name: { type: String, required: true, enum: DungeonName },
	type: { type: String, required: true, enum: DungeonType },
	level: { type: String, required: false },
	thumbnail: { type: String, required: false },
}, { collection: 'dungeon', timestamps: true });

export const MemberSchema = new Schema<IMember, Model<IMember>>({
	userId: { type: String, required: false },
	role: { type: String, enum: MemberRole },
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
	startTime: { type: Date },
	hasLust: { type: Boolean },
	hasBrez: { type: Boolean },
}, { collection: 'group', timestamps: true });
