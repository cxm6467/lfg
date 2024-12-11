import { Client, EmbedBuilder, StartThreadOptions, ColorResolvable } from 'discord.js';
import { GroupModel } from '../../models/group';
import { convertDungeonName as convertDungeonNameToUrl, getEmbedColor, getMessageByMessageId, logger, mentionHelper } from '../../utils';
import { LogLevel, MemberRole, ModalField } from '../../enums';

/**
 * Adds an embed to a specified group message and starts a thread for the group.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group to which the embed will be added.
 * @param userId - The ID of the user initiating the embed addition.
 *
 * @returns A promise that resolves when the embed and thread have been successfully created and updated.
 *
 * The function performs the following steps:
 * 1. Finds the group by its ID.
 * 2. Retrieves the message associated with the group.
 * 3. Constructs an embed with group details such as dungeon name, roles, and notes.
 * 4. Edits the message to include the new embed.
 * 5. Starts a private thread for the group.
 * 6. Updates the group document with the embed and thread IDs.
 * 7. Logs relevant information for debugging purposes.
 * 8. Sends a mention message in the thread based on the initial member role and dungeon type.
 *
 * If the group is not found, a warning is logged.
 */
export const addEmbed = async (client: Client, groupId: string, userId: string) => {
	const group = await GroupModel.findOne({ groupId });

	if (group?.groupId && group.guildId && group.channelId && group.messageId) {

		const msg = await getMessageByMessageId(client, group.messageId, group.guildId, group.channelId);

		const thumbnailUrl = convertDungeonNameToUrl(group.dungeon?.name);
		const embedColor = getEmbedColor(group.dungeon?.name) as ColorResolvable;
		const initialMemberRole = group.members?.find(member => member.userId === userId)?.role;

		const mentions = mentionHelper(group.guildId, initialMemberRole, group.dungeon.type);
		logger(LogLevel.INFO, `Thumbnail URL: ${thumbnailUrl}, Dungeon: ${group.dungeon?.name}`, client.guilds.cache.map((guild) => guild.name).join(', '));

		const embed = new EmbedBuilder()
			.setTitle(group.groupName || 'Group Name')
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
					value: `${(() => {
						const dpsMembers = (group.members ?? []).filter(member => member.role === MemberRole.Dps);
						if (dpsMembers.length === 0) return 'None\nNone';
						if (dpsMembers.length === 1) return 'None';
						return dpsMembers.map(member => `<@${member.userId}>`).join(', ');
					})()}` },
				{
					name: '**Bres**',
					value: group.members?.some(member => member.hasBres)
						? '✅'
						: 'None',
				},
				{
					name: '**Lust**',
					value: group.members?.some(member => member.hasLust)
						? '✅'
						: 'None',
				},
				{
					name: `**${ModalField.Notes}**`,
					value: group.notes || 'No notes available.',
				},
			]);

		const embedMessage = await msg?.edit({ embeds: [embed] });
		const thread = await msg?.startThread(
      {
      	name: group.groupName || 'Group Name',
      	autoArchiveDuration: 60,
      	reason: 'Group thread started by the bot',
      	type: 'private',
      } as StartThreadOptions,
		);
		await group.updateOne({ embedId: embedMessage?.id, threadId: thread?.id });

		logger(LogLevel.INFO, `Members: ${JSON.stringify(group.members)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		logger(LogLevel.INFO, `Member: ${group.members?.find(member => member.userId === userId)}\n userId: ${userId}\n client user id: ${userId}`, client.guilds.cache.map((guild) => guild.name).join(', '));

		logger(LogLevel.INFO, `Initial Member Role: ${initialMemberRole}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		logger(LogLevel.INFO, `Mentions: ${JSON.stringify(mentions)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
		await thread?.send(`${group.groupName || 'Group Name'}`);
	}
	else {
		logger(LogLevel.WARN, 'Group not found', client.guilds.cache.map((guild) => guild.name).join(', '));
	}
};
