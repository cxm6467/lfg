export interface IGuildConfig {
  guildId: string;
  guildName: string;
  lfmChannelId?: string;
  linkedGuilds: Array<{
    guildId: string;
    guildName: string;
    lfmChannelId?: string;
    xpostingEnabled: boolean;
    xpostingSettings: {
      includeVoiceChannels: boolean;
      includeRaidProgress: boolean;
      includeMythicPlusScore: boolean;
      customMessage?: string;
    };
    linkedAt: Date;
  }>;
  settings: {
    autoCleanupHours: number;
    voiceChannelAutoCreate: boolean;
    warningMessageEnabled: boolean;
    xpostingEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
