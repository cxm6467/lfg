import { Client, Message, User } from 'discord.js';
import { LogLevel, MemberRole } from '../../enums';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, getThreadByMessageId, logger } from '../../utils';
import { updateEmbedField, clearUserFromEmbed } from '../../services';

/**
 * Handles the addition of a Healer role to a user in a group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the user belongs.
 * @param user - The Discord user who clicked the add healer button.
 *
 * @returns A promise that resolves when the role has been added or an appropriate message has been sent to the user.
 *
 * @remarks
 * - If the group is not found, logs an error message.
 * - If the user is not found in the group, logs an error message.
 * - If the user already has a role in the group, sends a message to the user.
 * - If there is already a Healer in the group, sends a message to the user.
 * - If the user has no role and there is no Healer in the group, assigns the Healer role to the user, updates the group, and updates the embed message.
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

		// Check if user is switching from another role
		const isRoleSwitching = existingMember && existingMember.role !== MemberRole.None && existingMember.role !== undefined;

		const healerCount = members.filter(member => member.role === MemberRole.Healer).length;

		// Check if there is room to add a Healer role (or if user is switching roles)
		if (healerCount < 1 || (isRoleSwitching && existingMember?.role === MemberRole.Healer)) {
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

				existingMember.role = MemberRole.Healer;

				if (isRoleSwitching && oldRole !== MemberRole.Healer) {
					const thread = await getThreadByMessageId(client, group.threadId ?? '');
					await thread?.send(`<@${user.id}> switched from ${oldRole} to Healer.`);
				}
			}
			else {
				members.push({ userId: user.id, role: MemberRole.Healer });
				const thread = await getThreadByMessageId(client, group.threadId ?? '');
				await thread?.send(`<@${user.id}> has joined the group as Healer.`);
			}

			group.members = members;
			await group.save();

			await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Healer, user.id);
			logger(LogLevel.INFO, `Healer role assigned to user with id ${user.id} in group with id ${groupId}`);
		}
		else {
			await user.send('You cannot be added as a Healer because the group already has a Healer role assigned.');
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error in addHealerButtonHandler: ${(error as Error).message}`);
	}
};
