import { Client, Embed, User } from 'discord.js';
import { Document } from 'mongoose';
import { MemberRole } from '../../enums';
import { getMessageByMessageId } from '../../utils';
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
 * 3. If the user does not have a role or their role is already None, sends a message to the user and exits.
 * 4. Clears the user's role and updates the group's members list.
 * 5. Saves the updated group document to the database.
 * 6. Retrieves the embed message associated with the group.
 * 7. Updates the embed message to reflect the cleared role and any changes to the Lust and Bres fields.
 * 8. Edits the embed message with the updated embed.
 *
 * @throws Will throw an error if the group document cannot be retrieved or saved, or if the embed message cannot be found or edited.
 */
export const clearRoleButtonHandler = async (client: Client, groupId: string, user: User) => {
	const group = await GroupModel.findOne({ groupId }) || {} as Document & IGroup;
	const userMember = group.get('members').find((member: { userId: string; role: string; }) => member.userId === user.id);
	const originalRole = userMember?.role;

	if (!userMember || userMember.role === MemberRole.None || userMember.role === undefined) {
		await user.send('You don\'t have a role in this group.');
		return;
	}

	// Check if the user's role is DPS before proceeding
	if (originalRole === MemberRole.Dps) {
		// Remove user from DPS list
		userMember.role = MemberRole.None;
		userMember.hasBres = false;
		userMember.hasLust = false;

		// Update the group's member list to exclude this user's DPS role
		group.set('members', group.get('members').map((member: { userId: string; role: string; }) => {
			if (member.userId === user.id) {
				return userMember;
			}
			return member;
		}));

		await group.save();

		const embedMessage = await getMessageByMessageId(client, group.messageId ?? '', group.guildId ?? '', group.channelId ?? '');
		if (!embedMessage) {
			await user.send('The message for the embed could not be found.');
			return;
		}

		const embed: Embed = embedMessage.embeds[0];
		const dpsField = embed.fields.find(field => field.name === '**DPS**');
		const lustField = embed.fields.find(field => field.name === '**Lust**');
		const bresField = embed.fields.find(field => field.name === '**Bres**');

		// Update DPS field to remove the user while keeping other DPS users
		if (dpsField && dpsField.value.includes(`<@${user.id}>`)) {
			const updatedDps = dpsField.value.split('\n').filter(entry => !entry.includes(`<@${user.id}>`)).join('\n');
			dpsField.value = updatedDps || 'None';
		}

		// Update Lust and Bres fields if necessary
		if (lustField && !group.members?.some(member => member.hasLust)) {
			lustField.value = 'None';
		}
		if (bresField && !group.members?.some(member => member.hasBres)) {
			bresField.value = 'None';
		}

		await embedMessage.edit({ embeds: [embed] });
		await user.send(`Your DPS role has been cleared for group ${group.get('groupName')}.`);
	}
	else {
		await user.send('You do not have a DPS role in this group.');
	}
};
