import { DungeonName, DungeonType } from '../enums/';

export interface IDungeon {
  name: string; // Changed from DungeonName enum to string for dynamic dungeons
  type: DungeonType;
  level?: number | string;
  thumbnail?: string;
}