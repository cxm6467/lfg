import { Client } from "discord.js";

export const getThreadByMessageId = async (client: Client, threadId: string) => {
  try {
    return await client.channels.fetch(threadId);
  } catch (error) {
    console.error(`Error fetching thread with id ${threadId}:`, error);
  }
}