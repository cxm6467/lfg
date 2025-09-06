import { Schema, Model } from 'mongoose';
import { IGuildConfig } from '../interfaces/IGuildConfig';

export const GuildConfigSchema = new Schema<IGuildConfig, Model<IGuildConfig>>({
  guildId: { type: String, required: true, unique: true },
  guildName: { type: String, required: true },
  lfmChannelId: { type: String, required: false },
  linkedGuilds: [{
    guildId: { type: String, required: true },
    guildName: { type: String, required: true },
    lfmChannelId: { type: String, required: false },
    xpostingEnabled: { type: Boolean, default: true },
    xpostingSettings: {
      includeVoiceChannels: { type: Boolean, default: true },
      includeRaidProgress: { type: Boolean, default: true },
      includeMythicPlusScore: { type: Boolean, default: true },
      customMessage: { type: String, required: false },
    },
    linkedAt: { type: Date, default: Date.now },
  }],
  settings: {
    autoCleanupHours: { type: Number, default: 24 },
    voiceChannelAutoCreate: { type: Boolean, default: true },
    warningMessageEnabled: { type: Boolean, default: true },
    xpostingEnabled: { type: Boolean, default: true },
  },
}, { collection: 'guildconfig', timestamps: true });
