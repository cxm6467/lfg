import { Client, Embed, User } from 'discord.js';
import { Document } from 'mongoose';
import { MemberRole } from '../../enums';
import { getMessageByMessageId } from '../../utils';
import { IGroup } from '../../interfaces';
import { GroupModel } from '../../models/group';

export const clearRoleButtonHandler = async (client: Client, groupId: string, user: User) => {
	const group = await GroupModel.findOne({ groupId }) || {} as Document & IGroup;
	const userMember = group.get('members').find((member: { userId: string; role: string; }) => member.userId === user.id);
	const originalRole = userMember.role;

	if (!userMember || !Object.values(MemberRole).includes(userMember.role) || userMember.role === MemberRole.None) {
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
		// update embed
		// get message for embed
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


		console.log(embed.fields);
		console.log('Original role:', originalRole);
		console.log('Role field:', roleField);
		if (roleField && roleField.value.includes(`<@${user.id}>`)) {
			console.log('Role field found:', roleField);
			roleField.value = 'None';
		}
		else {
			console.log('Role field not found');
		}
		await embedMessage.edit({ embeds: [embed] });
		// get embed
		// await user.send(`Your role has been cleared for group ${group.get("groupName")}.`);
	}
};