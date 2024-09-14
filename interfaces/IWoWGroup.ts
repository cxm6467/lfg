import { IMember, IDungeon } from './';

export interface IWoWGroup {
  groupName: string;
  dungeon: IDungeon;
  members?: IMember[];
  channelId?: string;
  guildId?: string;
  threadId?: string;
  messageId?: string;
  embedId?: string;
}