import { Client, Message, User } from 'discord.js';
import { LogLevel, PartyBuffs } from '../../enums';
import { GroupModel } from '../../models/group';
import { updateEmbedField } from '../../services';
import { getMessageByMessageId, logger } from '../../utils';

/**
 * Handles the addition of the "Lust" buff to a group in a Discord server.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the "Lust" buff is being added.
 * @param user - The Discord user who triggered the addition of the "Lust" buff.
 *
 * @returns A promise that resolves when the operation is complete.
 *
 * This function performs the following steps:
 * 1. Finds the group by its ID.
 * 2. If the group exists and does not already have the "Lust" buff:
 *    - Sets the group's `hasLust` property to true.
 *    - Finds the member in the group who triggered the buff and sets their `hasLust` property to true.
 *    - Saves the updated group to the database.
 *    - Retrieves the message associated with the group and updates the embed field to reflect the addition of the "Lust" buff.
 * 3. If the group does not exist, logs an error message.
 */
export const addLustButtonHandler = async (client: Client, groupId: string, user:User) => {
	const group = await GroupModel.findOne({ groupId });

	if (group) {
		if (!group.members?.some(m => m.hasLust) && group?.members?.some(m => m.userId === user.id)) {
			group.hasLust = true;
			const member = group?.members?.find(m => m.userId === user.id);
			if (member) {
				member.hasLust = true;
			}
			await group.save();
			const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
			await updateEmbedField(embedMessage ?? {} as Message, PartyBuffs.Lust, user.id);
		}
		else {
			logger(LogLevel.WARN, `Group with id ${groupId} already has Lust or user is not in the group`);
			if (!group.members?.some(m => m.userId === user.id)) {
				user.send('You are not in the group');
			}
		}
	}
	else {
		logger(LogLevel.WARN, `Group with id ${groupId} not found`);
	}

};