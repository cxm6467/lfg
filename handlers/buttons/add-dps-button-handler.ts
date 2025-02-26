import { Client, Message, User } from 'discord.js';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, getThreadByMessageId, logger } from '../../utils';
import { LogLevel, MemberRole } from '../../enums';
import { updateEmbedField } from '../../services';

/**
 * Handles the addition of a DPS role to a user in a group when the corresponding button is pressed.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the user is being added.
 * @param user - The Discord user who is being assigned the DPS role.
 *
 * @returns A promise that resolves when the operation is complete.
 *
 * @remarks
 * - The function checks if the group exists and if the user is a member of the group.
 * - If the user is already a member and has no role, it assigns the DPS role to the user.
 * - The function ensures that there are no more than 3 DPS roles in the group.
 * - If the user already has a role or if the DPS role limit is reached, the user is notified via a direct message.
 * - If the group or user is not found, appropriate messages are logged to the console.
 */
export const addDpsButtonHandler = async (client: Client, groupId: string, user: User) => {
	try {
		const group = await GroupModel.findOne({ groupId });

		if (!group) {
			logger(LogLevel.WARN, `Group with id ${groupId} not found`);
			return;
		}

		const members = group.members ?? [];
		const existingMember = members.find((member: IMember) => member.userId === user.id);

		// Check if the user already has a role in this group
		if (existingMember) {
			if (existingMember.role !== MemberRole.None && existingMember.role !== undefined) {
				await user.send(`You already have a role in this group. Your current role is ${existingMember.role}.`);
				return;
			}
		}

		const dpsCount = members.filter(member => member.role === MemberRole.Dps).length;

		// Check if there is room to add a new DPS role
		if (dpsCount < 3) {
			if (existingMember) {
				existingMember.role = MemberRole.Dps;
			}
			else {
				members.push({ userId: user.id, role: MemberRole.Dps });
			}

			group.members = members;
			await group.save();

			const embedMessage = await getMessageByMessageId(
				client,
				group.messageId ?? '',
				group.guildId ?? '',
				group.channelId ?? '',
			);

			await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Dps, user.id);
			const thread = await getThreadByMessageId(client, group.threadId ?? '');
			await thread?.send(`<@${user.id}> has joined the group.`);
		}
		else {
			await user.send('You cannot be added as a DPS because the group already has 3 DPS roles.');
		}
	}
	catch (error: unknown) {
		logger(LogLevel.ERROR, `Error in addDpsButtonHandler: ${(error as Error).message}`);
	}
};
