/**
 * Handles the addition of a battle resurrection (Bres) button for a group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the Bres button is being added.
 * @param user - The Discord user who is adding the Bres button.
 *
 * @returns A promise that resolves when the Bres button has been handled.
 *
 * This function performs the following steps:
 * 1. Finds the group by the provided groupId.
 * 2. If the group exists and does not already have a Bres, it sets the group's hasBres property to true.
 * 3. Finds the member in the group who matches the provided user and sets their hasBres property to true.
 * 4. Saves the updated group to the database.
 * 5. Retrieves the message associated with the group and updates the embed field to reflect the new Bres status.
 *
 * If the group is not found, it logs an error message to the console.
 */
import { Client, Message, User } from 'discord.js';
import { updateEmbedField } from '../../services';
import { getMessageByMessageId, logger } from '../../utils';
import { GroupModel } from '../../models/group';
import { LogLevel, PartyBuffs } from '../../enums';


export const addBresButtonHandler = async (client: Client, groupId: string, user:User) => {
	const group = await GroupModel.findOne({ groupId });

	if (group) {
		if (!group.hasBres) {
			group.hasBres = true;
			const member = group?.members?.find(m => m.userId === user.id);
			if (member) {
				member.hasBres = true;
			}
			await group.save();
			const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
			await updateEmbedField(embedMessage ?? {} as Message, PartyBuffs.Bres, user.id);
		}
	}
	else {
		logger(LogLevel.WARN, `Group with id ${groupId} not found`);
	}
};