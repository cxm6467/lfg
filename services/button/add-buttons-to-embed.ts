import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import { getMessageByMessageId, logger } from '../../utils';
import { GroupModel } from '../../models/group';
import { LogLevel } from '../../enums';
import { SG_DEV_SERVER_ID, SG_PROD_SERVER_ID } from '../../consts';


enum CustomEmoji {
  Tank = '🛡️',
  Healer = '💉',
  Dps = '⚔️',
  Bres = '🪦',
  Lust = '🍖',
}

enum SGEmoji {
  Tank = '<:wow_tank:868737094242152488>',
  Healer = '<:wow_healer:868737094258950144>',
  Dps = '<:wow_dps:868737094011486229>',
  Bres = '🪦',
  Lust = '🍖',
}
/**
 * Adds interactive buttons to an existing embed message in a Discord channel.
 *
 * This function retrieves a group by its ID, fetches the corresponding embed message,
 * and adds several buttons to the embed. The buttons allow users to add roles such as
 * DPS, Healer, Tank, Lust, and Bres, clear roles, or mark the group as finished.
 *
 * @param client - The Discord client instance.
 * @param groupId - The ID of the group for which to add buttons to the embed.
 *
 * @returns A promise that resolves when the buttons have been successfully added to the embed.
 *
 * @throws Will log an error message if the group, embed message, or required IDs are not found.
 */
export const addEmbedButtons = async (client: Client, groupId: string, guildId:string) => {
	const group = await GroupModel.findOne({ groupId });

	if (group?.embedId && group.guildId && group.channelId) {
		const embedMessage = await getMessageByMessageId(client, group.embedId, group.guildId, group.channelId);
		const embed = embedMessage?.embeds[0];

		if (embed) {
			const updatedEmbed = EmbedBuilder.from(embed);

			const emojiEnum = (guildId === SG_DEV_SERVER_ID || guildId === SG_PROD_SERVER_ID) ? SGEmoji : CustomEmoji;

			const addDps = new ButtonBuilder()
				.setCustomId(`addDps[${group.groupId}]`)
				.setLabel('Dps')
				.setStyle(ButtonStyle.Primary)
				.setEmoji(`${emojiEnum.Dps}`);

			const addHealer = new ButtonBuilder()
				.setCustomId(`addHealer[${group.groupId}]`)
				.setLabel('Healer')
				.setStyle(ButtonStyle.Primary)
				.setEmoji(`${emojiEnum.Healer}`);

			const addTank = new ButtonBuilder()
				.setCustomId(`addTank[${group.groupId}]`)
				.setLabel('Tank')
				.setStyle(ButtonStyle.Primary)
				.setEmoji(`${emojiEnum.Tank}`);

			const addLust = new ButtonBuilder()
				.setCustomId(`addLust[${group.groupId}]`)
				.setLabel('Add Lust')
				.setStyle(ButtonStyle.Secondary);

			const addBres = new ButtonBuilder()
				.setCustomId(`addBres[${group.groupId}]`)
				.setLabel('Add Bres')
				.setStyle(ButtonStyle.Secondary);

			const clearRole = new ButtonBuilder()
				.setCustomId(`addClearRole[${group.groupId}]`)
				.setLabel('Clear Role')
				.setStyle(ButtonStyle.Danger);

			const markFinished = new ButtonBuilder()
				.setCustomId(`addFinish[${group.groupId}]`)
				.setLabel('Finish')
				.setStyle(ButtonStyle.Success);

			const rowOne = new ActionRowBuilder<MessageActionRowComponentBuilder>()
				.addComponents(addDps, addHealer, addTank);

			const rowTwo = new ActionRowBuilder<MessageActionRowComponentBuilder>()
				.addComponents(addLust, addBres);

			const rowThree = new ActionRowBuilder<MessageActionRowComponentBuilder>()
				.addComponents(clearRole, markFinished);

			await embedMessage.edit({
				embeds: [updatedEmbed],
				components: [rowOne, rowTwo, rowThree],
			});

			logger(LogLevel.INFO, 'Buttons added successfully.', client.guilds.cache.map((guild) => guild.name).join(', '));
		}
		else {
			logger(LogLevel.ERROR, 'Embed not found in the message.', client.guilds.cache.map((guild) => guild.name).join(', '));
		}
	}
	else {
		logger(LogLevel.WARN, `Message ID, Guild ID, or Channel ID not found in group. Embed ID: ${group?.embedId}, Guild ID: ${group?.guildId}, Channel ID: ${group?.channelId}, Message ID: ${group?.messageId}`, client.guilds.cache.map((guild) => guild.name).join(', '));
	}
};
