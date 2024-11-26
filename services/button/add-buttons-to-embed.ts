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
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import { getMessageByMessageId } from '../../utils';
import { GroupModel } from '../../models/group';
import { CustomEmoji } from '../../enums';


export const addEmbedButtons = async (client: Client, groupId: string) => {
	const group = await GroupModel.findOne({ groupId });

	if (group?.embedId && group.guildId && group.channelId) {
		const embedMessage = await getMessageByMessageId(client, group.embedId, group.guildId, group.channelId);
		const embed = embedMessage?.embeds[0];

		if (embed) {
			const updatedEmbed = EmbedBuilder.from(embed);

			const addDps = new ButtonBuilder()
				.setCustomId(`addDps[${group.groupId}]`)
				.setLabel(`${CustomEmoji.Dps}`)
				.setStyle(ButtonStyle.Primary);

			const addHealer = new ButtonBuilder()
				.setCustomId(`addHealer[${group.groupId}]`)
				.setLabel(`${CustomEmoji.Healer}`)
				.setStyle(ButtonStyle.Primary);

			const addTank = new ButtonBuilder()
				.setCustomId(`addTank[${group.groupId}]`)
				.setLabel(`${CustomEmoji.Tank}`)
				.setStyle(ButtonStyle.Primary);

			const addLust = new ButtonBuilder()
				.setCustomId(`addLust[${group.groupId}]`)
				.setLabel(`Add Lust${CustomEmoji.Lust}`)
				.setStyle(ButtonStyle.Secondary);

			const addBres = new ButtonBuilder()
				.setCustomId(`addBres[${group.groupId}]`)
				.setLabel(`Add Bres${CustomEmoji.Bres}`)
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

			console.log('Buttons added successfully.');
		}
		else {
			console.log('Embed not found in the message.');
		}
	}
	else {
		console.log('Message ID, Guild ID, or Channel ID not found in group.', {
			embedId: group?.embedId,
			guildId: group?.guildId,
			channelId: group?.channelId,
			messageId: group?.messageId,
		});
	}
};
