import { Client, Message, User } from 'discord.js';
import { LogLevel, MemberRole } from '../../enums';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, getThreadByMessageId, logger } from '../../utils';
import { updateEmbedField, clearUserFromEmbed } from '../../services';

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

		// Check if user is switching from another role
		const isRoleSwitching = existingMember && existingMember.role !== MemberRole.None && existingMember.role !== undefined;

		const tankCount = members.filter(member => member.role === MemberRole.Tank).length;

		// Check if there is room to add a Tank role (or if user is switching roles)
		if (tankCount < 1 || (isRoleSwitching && existingMember?.role === MemberRole.Tank)) {
			const embedMessage = await getMessageByMessageId(
				client,
				group.messageId ?? '',
				group.guildId ?? '',
				group.channelId ?? '',
			);

			if (existingMember) {
				const oldRole = existingMember.role;

				// Clear user from embed if switching roles
				if (isRoleSwitching) {
					await clearUserFromEmbed(embedMessage, user.id);
				}

				existingMember.role = MemberRole.Tank;

				if (isRoleSwitching && oldRole !== MemberRole.Tank) {
					const thread = await getThreadByMessageId(client, group.threadId ?? '');
					await thread?.send(`<@${user.id}> switched from ${oldRole} to Tank.`);
				}
			}
			else {
				members.push({ userId: user.id, role: MemberRole.Tank });
				const thread = await getThreadByMessageId(client, group.threadId ?? '');
				await thread?.send(`<@${user.id}> has joined the group as Tank.`);
			}

			group.members = members;
			await group.save();

			await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Tank, user.id);
			logger(LogLevel.INFO, `Tank role assigned to user with id ${user.id} in group with id ${groupId}`);
		}
		else {
			await user.send('You cannot be added as a Tank because the group already has a Tank role assigned.');
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error in addTankButtonHandler: ${(error as Error).message}`);
	}
};
