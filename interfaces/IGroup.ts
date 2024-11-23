import { IMember, IDungeon } from '.';

export interface IGroup {
  groupId: string;
  groupName: string;
  dungeon: IDungeon;
  members?: IMember[];
  startTime?: Date;
  notes?: string;
  channelId?: string;
  guildId?: string;
  threadId?: string;
  messageId?: string;
  embedId?: string;
  hasLust?: boolean;
  hasBres?: boolean;
}