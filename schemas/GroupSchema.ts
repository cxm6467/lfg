import { Schema, Model } from "mongoose";
import { IDungeon, IMember, IWoWGroup } from "../interfaces";
import { DungeonName, DungeonType, MemberRole } from "../enums";

export const DungeonSchema = new Schema<IDungeon, Model<IDungeon>>({  
  name: { type: String, required: true, enum: DungeonName },
  type: { type: String, required: true, enum: DungeonType },
  level: { type: String, required: false },
  thumbnail: { type: String, required: false },
}, {collection: 'dungeon', timestamps: true});

export const MemberSchema = new Schema<IMember, Model<IMember>>({
  userId: { type: String, required: false },
  role: { type: String, enum: MemberRole },
}, {collection: 'member', timestamps: true});

export const GroupSchema = new Schema<IWoWGroup, Model<IWoWGroup>>({
  groupName: { type: String, required: true},
  dungeon: DungeonSchema,
  members: { type: [MemberSchema] },
  guildId: { type: String},
  threadId: { type: String },
  messageId: { type: String },
  embedId: { type: String },
}, {collection: 'group', timestamps: true});
