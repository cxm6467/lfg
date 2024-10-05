import { Message } from "discord.js";

export interface IProssesedModalData {
  groupMessage: Message | undefined;
  startTime: number | undefined;
  timeZone: string;
  notes: string;
}