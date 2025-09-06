import { IGroup } from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';
import { addModal } from '../modal/add-modal';
import { DungeonName, DungeonType, MemberRole } from '../../enums';
import { ChatInputCommandInteraction } from 'discord.js';

/**
 * Processes the interaction response for a chat input command.
 *
 * This function extracts the options from the interaction, constructs a group object,
 * and adds a modal for the interaction with conditional level validation.
 *
 * @param interaction - The interaction object from the chat input command.
 * @returns A promise that resolves when the modal has been added.
 */
export const processInteractionResponse = async (interaction: ChatInputCommandInteraction) => {
	// Get subcommand name (normal, heroic, mythic, delve)
	const subcommand = interaction.options.getSubcommand();

	// Map subcommand to difficulty type
	const difficultyMap: Record<string, DungeonType> = {
		'normal': DungeonType.Normal,
		'heroic': DungeonType.Heroic,
		'mythic': DungeonType.Mythic,
		'delve': DungeonType.Delve,
	};

	const difficulty = difficultyMap[subcommand];
	const dungeon = interaction.options.getString('dungeon', true);
	const level = interaction.options.getString('level');
	const role = interaction.options.getString('role', true);

	// Level validation is handled by command structure now
	// Mythic requires level, others don't have level option (except delves which is optional)

	// For non-mythic difficulties, use default level if not provided
	const finalLevel = level && level !== 'N/A' ? level :
		difficulty === DungeonType.Mythic ? level : 'N/A';

	const groupName = finalLevel && finalLevel !== 'N/A' ?
		`${dungeon} ${difficulty} ${finalLevel}` :
		`${dungeon} ${difficulty}`;

	const group: IGroup = {
		groupId: uuidv4(),
		groupName,
		dungeon: {
			name : dungeon,
			type: difficulty as DungeonType,
			level: finalLevel ?? undefined,
		},
		members: [
			{
				role: role as MemberRole,
				userId: interaction.user.id,
			},
		],
		guildId: interaction.guildId ?? '',
		channelId: interaction.channelId,
	};

	await addModal(interaction, group);

	return;
};