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
	const group = await GroupModel.findOne({ groupId });

	if (group) {
		const groupMember = group.members?.find((member: IMember) => member.userId === user.id);
		if (groupMember) {
			logger(LogLevel.INFO, `User with id ${user.id} found in group with id ${groupId}`);
			if (groupMember.role === MemberRole.None) {
				logger(LogLevel.INFO, `User with id ${user.id} has no role in group with id ${groupId}`);
				if (group.members?.filter(member => member.role === MemberRole.Healer).length === 0) {
					logger(LogLevel.INFO, `No healer found in group with id ${groupId}`);
					groupMember.role = MemberRole.Healer;
					await group.save();
					const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
					await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Healer, user.id);
				}
				else {
					await user.send('You can only have 1 Healer in a group.');
				}
			}
			else {
				await user.send('You already have a role in this group.');
			}
		}
		else {
			logger(LogLevel.WARN, `User with id ${user.id} not found in group with id ${groupId}`);
		}
	}
	else {
		logger(LogLevel.WARN, `Group with id ${groupId} not found`);
	}

};