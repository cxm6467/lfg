import { Client, Embed, User } from 'discord.js';
import { Document } from 'mongoose';
import { LogLevel, MemberRole } from '../../enums';
import { getMessageByMessageId, logger } from '../../utils';
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

	if (!userMember?.role) {
		await user.send('You don\'t have a role in this group.');
		return;
	}

	if (!Object.values(MemberRole).includes(userMember.role) || userMember.role === MemberRole.None || userMember.role === undefined) {
		await user.send('You don\'t have a role in this group.');
		return;
	}
	else {
		userMember.role = MemberRole.None;
		userMember.hasBres = false;
		userMember.hasLust = false;

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
		const roleField = embed.fields.find(field => field.name.replace(/\*/g, '').trim() === originalRole.replace(/\*/g, '').trim());
		const lustField = embed.fields.find(field => field.name === '**Lust**');
		const bresField = embed.fields.find(field => field.name === '**Bres**');

		if (lustField && !group.members?.some(member => member.hasLust)) {
			lustField.value = 'None';
		}

		if (bresField && !group.members?.some(member => member.hasBres)) {
			bresField.value = 'None';
		}
		logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(embed.fields)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		logger(LogLevel.DEBUG, `Original role: ${originalRole}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		logger(LogLevel.DEBUG, `Role field: ${JSON.stringify(roleField)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		if (roleField && roleField.value.includes(`<@${user.id}>`)) {
			logger(LogLevel.INFO, `Role field found: ${JSON.stringify(roleField)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
			roleField.value = 'None';
		}
		else {
			logger(LogLevel.ERROR, 'Role field not found', client.guilds.cache.map((guild) => guild.name).join(', '));
		}
		await embedMessage.edit({ embeds: [embed] });
		// get embed
		// await user.send(Your role has been cleared for group ${group.get("groupName")}.);
	}
};