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
	const group = await GroupModel.findOne({ groupId });

	if (group) {
		const groupMember = group.members?.find((member: IMember) => member.userId === user.id);
		if (groupMember) {
			logger(LogLevel.INFO, `User with id ${user.id} found in group with id ${groupId}`);
			if (groupMember.role === MemberRole.None) {
				logger(LogLevel.INFO, `User with id ${user.id} has no role in group with id ${groupId}`);
				if (group.members?.filter(member => member.role === MemberRole.Tank).length === 0) {
					logger(LogLevel.INFO, `No Tank role found in group with id ${groupId}`);
					groupMember.role = MemberRole.Tank;
					await group.save();
					const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
					await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Tank, user.id);
				}
				else {
					await user.send('You can only have 1 Tank in a group.');
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