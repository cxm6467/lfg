import { ChatInputCommandInteraction, Client } from 'discord.js';
import { GroupModel } from '../../models/group';
import { clearRoleButtonHandler } from '../../handlers';

/**
 * Processes the leave command interaction by removing the user from the specified group.
 *
 * @param interaction - The interaction object from the leave command.
 * @param client - The Discord client instance.
 * @returns A promise that resolves when the leave operation has been processed.
 */
export const processLeaveCommand = async (interaction: ChatInputCommandInteraction, client: Client) => {
	const groupId = interaction.options.get('group_id')?.value as string;

	if (!groupId) {
		await interaction.reply({
			content: 'Please provide a group_id parameter.',
			flags: 64, // ephemeral
		});
		return;
	}

	// Check if group exists (support partial ID matching)
	let group = await GroupModel.findOne({ groupId });

	// If not found by full ID, try partial match (first 8 characters)
	if (!group && groupId.length === 8) {
		group = await GroupModel.findOne({
			groupId: { $regex: `^${groupId}` },
			guildId: interaction.guildId,
			archived: { $ne: true },
		});
	}

	if (!group) {
		await interaction.reply({
			content: `Group with ID ${groupId} not found. Use \`/groups\` to see available groups.`,
			flags: 64, // ephemeral
		});
		return;
	}

	// Check if user is in the group
	const userInGroup = group.members?.find(member => member.userId === interaction.user.id);
	if (!userInGroup) {
		await interaction.reply({
			content: `You are not a member of group ${group.groupName}.`,
			flags: 64, // ephemeral
		});
		return;
	}

	// Defer the reply since clear role handler might take time
	await interaction.deferReply({ flags: 64 }); // ephemeral

	try {
		// Use existing clear role handler
		await clearRoleButtonHandler(client, groupId, interaction.user);

		await interaction.editReply({
			content: `Successfully left group ${group.groupName}!`,
		});
	}
	catch (error) {
		await interaction.editReply({
			content: `Failed to leave group: ${(error as Error).message}`,
		});
	}
};