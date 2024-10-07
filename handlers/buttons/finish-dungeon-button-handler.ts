/* eslint-disable @typescript-eslint/no-unused-vars */
import { ButtonInteraction, ThreadChannel, User } from 'discord.js';
import { Document } from 'mongoose';

export const finishDungeonButtonHandler = async (interaction: ButtonInteraction, group: Document, user: User, thread: ThreadChannel) => {
	throw new Error('Not implemented');
};