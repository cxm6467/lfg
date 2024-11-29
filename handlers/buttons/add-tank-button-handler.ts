import { Client, Message, User } from 'discord.js';
import { LogLevel, MemberRole } from '../../enums';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, logger } from '../../utils';
import { updateEmbedField } from '../../services';

/**
 * Handles the addition of a Tank role to a user in a group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the user belongs.
 * @param user - The Discord user who clicked the add tank button.
 *
 * @returns A promise that resolves when the role has been added or an appropriate message has been sent to the user.
 *
 * @remarks
 * - If the group is not found, logs an error message.
 * - If the user is not found in the group, logs an error message.
 * - If the user already has a role in the group, sends a message to the user.
 * - If there is already a Tank in the group, sends a message to the user.
 * - If the user has no role and there is no Tank in the group, assigns the Tank role to the user, updates the group, and updates the embed message.
 */
export const addTankButtonHandler = async (client: Client, groupId: string, user: User) => {
	try {
		// Fetch the group from the database
		const group = await GroupModel.findOne({ groupId });

		if (!group) {
			logger(LogLevel.WARN, `Group with id ${groupId} not found`);
			return;
		}

		const members = group.members ?? [];
		const existingMember = members.find((member: IMember) => member.userId === user.id);

		if (!existingMember) {
			logger(LogLevel.WARN, `User with id ${user.id} not found in group with id ${groupId}`);
			return;
		}

		logger(LogLevel.INFO, `User with id ${user.id} found in group with id ${groupId}`);

		if (existingMember.role !== MemberRole.None) {
			await user.send(`You already have a role in this group. Your current role is ${existingMember.role}.`);
			return;
		}

		const tankCount = members.filter(member => member.role === MemberRole.Tank).length;

		if (tankCount > 0) {
			await user.send('You can only have 1 Tank in a group.');
			return;
		}

		// Assign the Tank role and save the group
		existingMember.role = MemberRole.Tank;
		await group.save();

		const embedMessage = await getMessageByMessageId(
			client,
			group.messageId ?? '',
			group.guildId ?? '',
			group.channelId ?? '',
		);

		await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Tank, user.id);

		logger(LogLevel.INFO, `Tank role assigned to user with id ${user.id} in group with id ${groupId}`);
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error in addTankButtonHandler: ${(error as Error).message}`);
	}
};
