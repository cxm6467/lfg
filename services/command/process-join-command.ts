import { ChatInputCommandInteraction, Client } from 'discord.js';
import { MemberRole } from '../../enums';
import { GroupModel } from '../../models/group';
import { addDpsButtonHandler, addHealerButtonHandler, addTankButtonHandler } from '../../handlers';

/**
 * Processes the join command interaction by adding the user to the specified group with the given role.
 *
 * @param interaction - The interaction object from the join command.
 * @param client - The Discord client instance.
 * @returns A promise that resolves when the join operation has been processed.
 */
export const processJoinCommand = async (interaction: ChatInputCommandInteraction, client: Client) => {
	const groupId = interaction.options.get('group_id')?.value as string;
	const role = interaction.options.get('role')?.value as MemberRole;

	if (!groupId || !role) {
		await interaction.reply({
			content: 'Please provide both group_id and role parameters.',
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

	// Defer the reply since role handlers might take time
	await interaction.deferReply({ flags: 64 }); // ephemeral

	try {
		// Use existing button handlers based on role
		switch (role) {
		case MemberRole.Dps:
			await addDpsButtonHandler(client, groupId, interaction.user);
			break;
		case MemberRole.Healer:
			await addHealerButtonHandler(client, groupId, interaction.user);
			break;
		case MemberRole.Tank:
			await addTankButtonHandler(client, groupId, interaction.user);
			break;
		default:
			await interaction.editReply({
				content: `Invalid role: ${role}. Please use Tank, Healer, or Dps.`,
			});
			return;
		}

		await interaction.editReply({
			content: `Successfully joined group ${group.groupName} as ${role}!`,
		});
	}
	catch (error) {
		await interaction.editReply({
			content: `Failed to join group: ${(error as Error).message}`,
		});
	}
};