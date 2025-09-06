export interface IUser {
  discordUserId: string;
  battleTag?: string;
  mainCharacter?: {
    name: string;
    realm: string;
    region: string;
    class: string;
    spec: string;
  };
  raiderIoData?: {
    mythicPlusScore: number;
    raidProgress?: {
      raidName: string;
      difficulty: string;
      bossesKilled: number;
      totalBosses: number;
    }[];
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
