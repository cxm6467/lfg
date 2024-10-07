import { DungeonName, DungeonType } from '../enums/';

export interface IDungeon {
  name: DungeonName;
  type: DungeonType;
  level?: number | string;
  thumbnail?: string;
}