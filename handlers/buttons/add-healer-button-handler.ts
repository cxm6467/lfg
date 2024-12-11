import { Client, Message, User } from 'discord.js';
import { LogLevel, MemberRole } from '../../enums';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, logger } from '../../utils';
import { updateEmbedField } from '../../services';

/**
 * Handles the addition of a healer to a group when the corresponding button is pressed.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the healer is to be added.
 * @param user - The Discord user who pressed the button.
 *
 * @returns A promise that resolves when the handler has completed its operations.
 *
 * @remarks
 * - If the group is found and the user is a member of the group with no role, the user is assigned the healer role if no other healer exists in the group.
 * - If the user already has a role, a message is sent to the user indicating that they already have a role.
 * - If another healer already exists in the group, a message is sent to the user indicating that only one healer is allowed.
 * - If the user is not found in the group, a log message is generated.
 * - If the group is not found, a log message is generated.
 */
export const addHealerButtonHandler = async (client: Client, groupId: string, user: User) => {
	try {
		// Fetch the group from the database
		const group = await GroupModel.findOne({ groupId });

		if (!group) {
			logger(LogLevel.WARN, `Group with id ${groupId} not found`);
			return;
		}

		const members = group.members ?? [];
		const existingMember = members.find((member: IMember) => member.userId === user.id);

		if (existingMember?.role !== MemberRole.None) {
			await user.send(`You already have a role in this group. Your current role is ${existingMember?.role}.`);
			return;
		}

		logger(LogLevel.INFO, `User with id ${user.id} found in group with id ${groupId}`);

		if (existingMember.role !== MemberRole.None) {
			await user.send(`You already have a role in this group. Your current role is ${existingMember.role}.`);
			return;
		}

		const healerCount = members.filter(member => member.role === MemberRole.Healer).length;

		if (healerCount > 0) {
			await user.send('You can only have 1 Healer in a group.');
			return;
		}

		// Assign the healer role and save the group
		existingMember.role = MemberRole.Healer;
		await group.save();

		const embedMessage = await getMessageByMessageId(
			client,
			group.messageId ?? '',
			group.guildId ?? '',
			group.channelId ?? '',
		);

		await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Healer, user.id);

		logger(LogLevel.INFO, `Healer role assigned to user with id ${user.id} in group with id ${groupId}`);
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error in addHealerButtonHandler: ${(error as Error).message}`);
	}
};
