import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChatInputCommandInteraction } from 'discord.js';
import { IGroup } from '../../interfaces';
import { GroupModel } from '../../models/group';

/**
 * Adds a modal for a group interaction.
 *
 * This function creates a modal with inputs for start time, timezone, and optional notes.
 * It then displays the modal to the user and creates a new group in the database.
 *
 * @param {ChatInputCommandInteraction} interaction - The interaction that triggered the command.
 * @param {IGroup} group - The group information to be used in the modal.
 * @returns {Promise<void>} A promise that resolves when the modal is shown and the group is created.
 */
export const addModal = async (interaction: ChatInputCommandInteraction, group:IGroup) => {
	const dateInput = new TextInputBuilder()
		.setCustomId('start-time')
		.setLabel('Start Time')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('Enter a Date and Time (MM/DD/YY HH:MM AM/PM)')
		.setRequired(true);

	const tzInput = new TextInputBuilder()
		.setCustomId('tz')
		.setLabel('Timezone')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('Select a Timezone')
		.setRequired(true)
		.setMinLength(2);

	const notesInput = new TextInputBuilder()
		.setCustomId('notes')
		.setLabel('Notes')
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder('Optional Notes')
		.setRequired(false);

	const modal = new ModalBuilder()
		.setCustomId(`add-group-started-by-[${group.groupId}]`)
		.setTitle(group.groupName);

	modal.addComponents(
		new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
		new ActionRowBuilder<TextInputBuilder>().addComponents(tzInput),
		new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput),
	);
	await GroupModel.create(group);
	await interaction.showModal(modal);
};