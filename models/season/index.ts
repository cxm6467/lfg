import mongoose from 'mongoose';
import { ISeason } from '../../interfaces/ISeason';
import { SeasonSchema } from '../../schemas/SeasonSchema';

export const SeasonModel = mongoose.model<ISeason>('Season', SeasonSchema, 'season');
