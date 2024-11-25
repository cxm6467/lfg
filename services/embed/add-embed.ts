import { Client, EmbedBuilder, StartThreadOptions, ColorResolvable } from 'discord.js';
import { GroupModel } from '../../models/group';
import { convertDungeonName as convertDungeonNameToUrl, getEmbedColor, getMessageByMessageId, mentionHelper } from '../../utils';
import { MemberRole, ModalField } from '../../enums';

export const addEmbed = async (client: Client, groupId: string, userId: string) => {
	const group = await GroupModel.findOne({ groupId });

	if (group?.groupId && group.guildId && group.channelId && group.messageId) {
		// console.log('Group found:', group);

		const msg = await getMessageByMessageId(client, group.messageId, group.guildId, group.channelId);
		// console.log('Message found:', msg);


		const thumbnailUrl = convertDungeonNameToUrl(group.dungeon?.name);
		const embedColor = getEmbedColor(group.dungeon?.name) as ColorResolvable;
		console.log('Thumbnail URL:', thumbnailUrl, 'Dungeon:', group.dungeon?.name);

		const embed = new EmbedBuilder()
			.setColor(embedColor)
			.setThumbnail(thumbnailUrl)
			.addFields([
				{
					name: '**Dungeon**',
					value: group.dungeon?.name && group.dungeon?.type && group.dungeon?.level
						? `${group.dungeon.name} ${group.dungeon.type} ${group.dungeon.level}`
						: 'None',
				},
				{
					name: '**StartTime**',
					value: 'None',
				},
				{
					name: `**${MemberRole.Tank}**`,
					value: `${(group.members ?? []).find(member => member.role === MemberRole.Tank)?.userId
						? `<@${(group.members ?? []).find(member => member.role === MemberRole.Tank)?.userId}>`
						: 'None'}`,
				},
				{
					name: `**${MemberRole.Healer}**`,
					value: `${(group.members ?? []).find(member => member.role === MemberRole.Healer)?.userId
						? `<@${(group.members ?? []).find(member => member.role === MemberRole.Healer)?.userId}>`
						: 'None'}`,
				},
				{
					name: `**${MemberRole.Dps}**`,
					value: `${(group.members ?? []).filter(member => member.role === MemberRole.Dps).map(member => `<@${member.userId}>`).join(', ') || 'None'}`,
				},
				{
					name: '**Bres**',
					value: group.hasBres
						? '✅'
						: 'None',
				},
				{
					name: '**Lust**',
					value: group.hasLust
						? '✅'
						: 'None',
				},
				{
					name: `**${ModalField.Notes}**`,
					value: group.notes || 'No notes available.',
				},
			]);

		// console.log('Embed created:', embed);

		const embedMessage = await msg?.edit({ embeds: [embed] });
		// console.log('Embed message edited:', embedMessage);
		const thread = await msg?.startThread(
      {
      	name: group.groupName || 'Group Name',
      	autoArchiveDuration: 60,
      	reason: 'Group thread started by the bot',
      	type: 'private',
      } as StartThreadOptions,
		);
		await group.updateOne({ embedId: embedMessage?.id, threadId: thread?.id });

		console.log('Members:', group.members);
		console.log(`Member: ${group.members?.find(member => member.userId === userId)}\n userId: ${userId}\n client user id: ${userId}`);
		const initialMemberRole = group.members?.find(member => member.userId === userId)?.role;
		// add mentions to thread
		const mentions = mentionHelper(group.guildId, initialMemberRole, group.dungeon.type);
		console.log('Initial Member Role:', initialMemberRole);
		console.log('Mentions:', mentions);
		await thread?.send(`${mentions?.join(' ')}`);
	}
	else {
		console.error('Group not found');
	}
};
