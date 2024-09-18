import { IMember, IDungeon } from '.';
import { IButton } from './IButton';

export interface IGroup {
  groupId: string;
  groupName: string;
  dungeon: IDungeon;
  members?: IMember[];
  buttons?: IButton[];
  startTime?: Date;
  notes?: string;
  channelId?: string;
  guildId?: string;
  threadId?: string;
  messageId?: string;
  embedId?: string;
}