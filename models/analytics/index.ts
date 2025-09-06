import { model } from 'mongoose';
import { IPlayerStats, IGroupParticipation, IRating, IGuildAnalytics, IPlayerCompatibility } from '../../interfaces/IPlayerAnalytics';
import { PlayerStatsSchema, GroupParticipationSchema, RatingSchema, GuildAnalyticsSchema, PlayerCompatibilitySchema } from '../../schemas/AnalyticsSchema';

export const PlayerStatsModel = model<IPlayerStats>('PlayerStats', PlayerStatsSchema);
export const GroupParticipationModel = model<IGroupParticipation>('GroupParticipation', GroupParticipationSchema);
export const RatingModel = model<IRating>('Rating', RatingSchema);
export const GuildAnalyticsModel = model<IGuildAnalytics>('GuildAnalytics', GuildAnalyticsSchema);
export const PlayerCompatibilityModel = model<IPlayerCompatibility>('PlayerCompatibility', PlayerCompatibilitySchema);