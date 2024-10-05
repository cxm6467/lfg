import { Message } from "discord.js";

export interface IProssesedModalData {
  groupMessage: Message | undefined;
  epochTimestamp: number | undefined;
  timeZone: string;
  notes: string;
}