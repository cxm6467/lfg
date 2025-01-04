import { Client, Embed, User } from 'discord.js';
import { Document } from 'mongoose';
import { LogLevel, MemberRole } from '../../enums';
import { getMessageByMessageId, getThreadByMessageId, logger } from '../../utils';
import { IGroup } from '../../interfaces';
import { GroupModel } from '../../models/group';

/**
 * Handles the clear role button interaction for a user in a Discord group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group from which the role is to be cleared.
 * @param user - The Discord user whose role is to be cleared.
 *
 * @returns A promise that resolves when the role has been cleared and the embed message has been updated.
 *
 * @remarks
 * This function performs the following steps:
 * 1. Retrieves the group document from the database using the provided groupId.
 * 2. Finds the user in the group's members list and retrieves their current role.
 * 3. If the user does not have a role or their role is already `None`, sends a message to the user and exits.
 * 4. Clears the user's role and updates the group's members list.
 * 5. Saves the updated group document to the database.
 * 6. Retrieves the embed message associated with the group.
 * 7. Updates the embed message to reflect the cleared role and any changes to the `Lust` and `Bres` fields.
 * 8. Edits the embed message with the updated embed.
 *
 * @throws Will throw an error if the group document cannot be retrieved or saved, or if the embed message cannot be found or edited.
 */
export const clearRoleButtonHandler = async (client: Client, groupId: string, user: User) => {
	try {
		// Fetch the group document
		const group = await GroupModel.findOne({ groupId }) || {} as Document & IGroup;
		if (!group) {
			throw new Error(`Group with ID ${groupId} not found.`);
		}

		const userMember = group.get('members').find(
			(member: { userId: string; role: string }) => member.userId === user.id,
		);
		if (!userMember) {
			await user.send('You are not a member of this group.');
			return;
		}

		const originalRole = userMember.role;
		if (!originalRole || originalRole === MemberRole.None) {
			await user.send('You don’t currently have a role in this group.');
			return;
		}

		// Clear the user's role and associated capabilities
		userMember.role = MemberRole.None;
		const wasBres = userMember.hasBres;
		const wasLust = userMember.hasLust;
		userMember.hasBres = false;
		userMember.hasLust = false;

		// Update the group's members list
		group.set(
			'members',
			group.get('members').map((member: { userId: string }) =>
				member.userId === user.id ? userMember : member,
			),
		);

		// Save the updated group document
		await group.save();

		// Retrieve the embed message
		const embedMessage = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
		if (!embedMessage) {
			throw new Error('Embed message not found.');
		}

		const embed: Embed = embedMessage.embeds[0];

		// Update the role-specific field in the embed
		const roleField = embed.fields.find(field => field.name.replace(/\*/g, '').trim().toLowerCase() === originalRole.toLowerCase());
		if (roleField) {
			if (originalRole === MemberRole.Dps) {
				// Rebuild DPS field, excluding the current user
				const updatedDps = roleField.value
					.split('\n')
					.filter(mention => !mention.includes(`<@${user.id}>`))
					.join('\n') || 'None';
				roleField.value = updatedDps;
			}
			else {
				roleField.value = 'None';
			}
		}

		// Update Lust field if applicable
		const lustField = embed.fields.find(field => field.name === '**Lust**');
		if (lustField && wasLust && !group?.members?.some(member => member.hasLust)) {
			lustField.value = 'None';
		}

		// Update Bres field if applicable
		const bresField = embed.fields.find(field => field.name === '**Bres**');
		if (bresField && wasBres && !group?.members?.some(member => member.hasBres)) {
			bresField.value = 'None';
		}

		// Save the updated embed
		await embedMessage.edit({ embeds: [embed] });
		const thread = await getThreadByMessageId(client, group.threadId ?? '');
		await thread?.send(`${user.displayName} has left the group.`);

		// Notify the user of the update
		await user.send(`Your role has been cleared in group ${group.get('groupName')}.`);

		// Log success
		logger(LogLevel.INFO, `Role cleared for user ${user.id} in group ${groupId}. Embed updated.`);
	}
	catch (error) {
		// Log and notify errors
		logger(LogLevel.ERROR, `Failed to clear role for user ${user.id} in group ${groupId}: ${(error as Error).message}`);
		await user.send(`An error occurred while clearing your role: ${(error as Error).message}`);
	}
};
