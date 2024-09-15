import { IMember, IDungeon } from './';

export interface IWoWGroup {
  groupId: string;
  groupName: string;
  dungeon: IDungeon;
  members?: IMember[];
  channelId?: string;
  guildId?: string;
  threadId?: string;
  messageId?: string;
  embedId?: string;
}