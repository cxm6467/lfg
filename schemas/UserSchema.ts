import { Schema, Model } from 'mongoose';
import { IUser } from '../interfaces/IUser';

export const UserSchema = new Schema<IUser, Model<IUser>>({
  discordUserId: { type: String, required: true, unique: true },
  battleTag: { type: String, required: false },
  mainCharacter: {
    name: { type: String, required: false },
    realm: { type: String, required: false },
    region: { type: String, required: false },
    class: { type: String, required: false },
    spec: { type: String, required: false },
  },
  raiderIoData: {
    mythicPlusScore: { type: Number, required: false },
    raidProgress: [{
      raidName: { type: String, required: false },
      difficulty: { type: String, required: false },
      bossesKilled: { type: Number, required: false },
      totalBosses: { type: Number, required: false },
    }],
    lastUpdated: { type: Date, required: false },
  },
}, { collection: 'user', timestamps: true });
