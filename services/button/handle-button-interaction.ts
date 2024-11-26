import { ButtonInteraction, Client, ThreadChannel, User } from 'discord.js';
import { GroupModel } from '../../models/group';
import { getThreadByMessageId, logger } from '../../utils';
import { addBresButtonHandler, addDpsButtonHandler, addHealerButtonHandler, addLustButtonHandler, addTankButtonHandler, clearRoleButtonHandler, finishDungeonButtonHandler } from '../../handlers';
import { LogLevel } from '../../enums';

/**
 * Handles button interactions for a Discord bot.
 *
 * @param customId - The custom ID of the button that was pressed.
 * @param groupId - The ID of the group associated with the button interaction.
 * @param user - The Discord user who pressed the button.
 * @param client - The Discord client instance.
 * @param interaction - The button interaction instance.
 *
 * This function handles various button interactions by checking the customId
 * and executing the corresponding handler function. It supports the following
 * button interactions:
 * - 'addDps': Adds a DPS role to the user.
 * - 'addHealer': Adds a Healer role to the user.
 * - 'addTank': Adds a Tank role to the user.
 * - 'addLust': Adds a Lust role to the user.
 * - 'addBres': Adds a Bres role to the user.
 * - 'addFinish': Marks the dungeon as finished.
 * - 'addClearRole': Clears the user's role.
 *
 * If the thread associated with the group is not found, the function logs an
 * error message and returns early.
 *
 * Each button interaction is logged to the console for debugging purposes.
 */
export const handleButtonInteraction = async (customId: string, groupId:string, user: User, client: Client, interaction:ButtonInteraction) => {
	logger(LogLevel.INFO, `Button interaction received with customId: ${customId} and groupId: ${groupId}`);
	const group = await GroupModel.findOne({ groupId });
	const thread = await getThreadByMessageId(client, group?.threadId ?? '') as ThreadChannel<boolean> | undefined;

	if (!thread) {
		logger(LogLevel.ERROR, 'Thread not found');
		return;
	}
	switch (customId) {
	case 'addDps':
		if (group && thread) await addDpsButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add dps button pressed');
		break;
	case 'addHealer':
		if (group && thread) await addHealerButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add Healer button pressed');
		break;
	case 'addTank':
		if (group && thread) await addTankButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add Tank button pressed');
		break;
	case 'addLust':
		if (group && thread) await addLustButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add Lust button pressed');
		break;
	case 'addBres':
		if (group && thread) await addBresButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add Bres button pressed');
		break;
	case 'addFinish':
		if (group && thread) await finishDungeonButtonHandler(client, group, interaction.user);
		await interaction.deferUpdate();
		break;
	case 'addClearRole':
		if (group && thread) await clearRoleButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		logger(LogLevel.INFO, 'Add Clear Role button pressed');
		break;
	default:
		logger(LogLevel.WARN, 'Unknown button pressed');
	}
};