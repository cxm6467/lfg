import { Client, User } from 'discord.js';
import { Document } from 'mongoose';
import { IGroup } from '../../interfaces';
import { finishGroup } from '../../utils/tasks';

/**
 * Handles the finish dungeon button interaction.
 *
 * @param client - The Discord client instance.
 * @param group - The group document containing group details.
 *
 * @returns A promise that resolves when the group is finished.
 */
export const finishDungeonButtonHandler = async (client: Client, group: Document & IGroup, user: User) => {
	await finishGroup(client, group.groupId, user?.id);
};