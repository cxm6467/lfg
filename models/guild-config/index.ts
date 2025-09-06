import mongoose from 'mongoose';
import { IGuildConfig } from '../../interfaces/IGuildConfig';
import { GuildConfigSchema } from '../../schemas/GuildConfigSchema';

export const GuildConfigModel = mongoose.model<IGuildConfig>('GuildConfig', GuildConfigSchema, 'guildconfig');
