import { Schema, Model } from 'mongoose';
import { ISeason } from '../interfaces/ISeason';

export const SeasonSchema = new Schema<ISeason, Model<ISeason>>({
  seasonId: { type: String, required: true, unique: true },
  seasonName: { type: String, required: true },
  isCurrent: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
}, { collection: 'season', timestamps: true });
