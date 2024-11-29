import { Client, Message, User } from 'discord.js';
import { IMember } from '../../interfaces';
import { GroupModel } from '../../models/group';
import { getMessageByMessageId, logger } from '../../utils';
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

	const group = await GroupModel.findOne({ groupId });

	if (group) {
		const groupMember = group.members?.find((member: IMember) => member.userId === user.id);
		if (groupMember) {
			logger(LogLevel.INFO, `User with id ${user.id} found in group with id ${groupId}`, client.guilds.cache.map((guild) => guild.name).join(', '));
			if (groupMember.role === MemberRole.None) {
				if ((group.members?.filter(member => member.role === MemberRole.Dps).length ?? 0) <= 2
          && (group.members?.filter(member => member.userId !== user?.id).length ?? 0) < 1) {
					groupMember.role = MemberRole.Dps;
					await group.save();
					const embedMessage: Message | undefined = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
					await updateEmbedField(embedMessage ?? {} as Message, MemberRole.Dps, user.id);
				}
				else {
					await user.send('You can only have 3 dps roles in a group.');
				}
			}
			else {
				await user.send('You already have a role in this group.');
			}
		}
		else {
			logger(LogLevel.WARN, `User with id ${user.id} not found in group with id ${groupId}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		}
	}
	else {
		logger(LogLevel.WARN, `Group with id ${groupId} not found`);
	}

};