import { Client, Message, User } from 'discord.js';
import { updateEmbedField } from '../../services';
import { getMessageByMessageId, logger } from '../../utils';
import { GroupModel } from '../../models/group';
import { LogLevel, PartyBuffs } from '../../enums';

/**
 * Handles the addition of a battle resurrection (Bres) button for a group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the Bres button is being added.
 * @param user - The Discord user who is adding the Bres button.
 */
export const addBresButtonHandler = async (client: Client, groupId: string, user: User) => {
	try {
		const group = await GroupModel.findOne({ groupId });

		if (!group) {
			logger(LogLevel.WARN, `Group with ID ${groupId} not found`);
			await user.send('The specified group was not found.');
			return;
		}

		// Check if user is part of the group
		const member = group.members?.find(m => m.userId === user.id);
		if (!member) {
			logger(LogLevel.WARN, `User ${user.id} is not in group ${groupId}`);
			await user.send('You are not a member of this group and cannot update it.');
			return;
		}

		// Check if the group already has Bres
		if (group?.members?.some(m => m.hasBres)) {
			logger(LogLevel.WARN, `Group with ID ${groupId} already has Bres`);
			await user.send('The group already has Bres set.');
			return;
		}

		group.hasBres = true;
		member.hasBres = true;
		await group.save();

		const embedMessage: Message | undefined = await getMessageByMessageId(
			client,
			group.messageId ?? '',
			group.guildId ?? '',
			group.channelId ?? '',
		);

		if (embedMessage) {
			await updateEmbedField(embedMessage, PartyBuffs.Bres, user.id);
		}
		else {
			logger(LogLevel.WARN, `Message for group ${groupId} not found`);
			await user.send('Failed to update the group message embed.');
		}

	}
	catch (error) {
		logger(LogLevel.ERROR, `Error handling addBresButton: ${(error as Error).message}`);
		await user.send('An error occurred while trying to add Bres.');
	}
};
