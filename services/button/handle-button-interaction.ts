import { ButtonInteraction, Client, ThreadChannel, User } from 'discord.js';
import { GroupModel } from '../../models/group';
import { getThreadByMessageId } from '../../utils';
import { addBresButtonHandler, addDpsButtonHandler, addHealerButtonHandler, addLustButtonHandler, addTankButtonHandler, clearRoleButtonHandler, finishDungeonButtonHandler } from '../../handlers';

export const handleButtonInteraction = async (customId: string, groupId:string, user: User, client: Client, interaction:ButtonInteraction) => {
	console.log(`Button interaction received with customId: ${customId} and groupId: ${groupId}`);
	const group = await GroupModel.findOne({ groupId });
	const thread = await getThreadByMessageId(client, group?.threadId ?? '') as ThreadChannel<boolean> | undefined;
	if (!thread) {
		// Handle the case where thread is undefined
		console.log('Thread not found');
		return;
	}
	switch (customId) {
	case 'addDps':
		if (group && thread) await addDpsButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Dps button pressed');
		break;
	case 'addHealer':
		if (group && thread) await addHealerButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Healer button pressed');
		break;
	case 'addTank':
		if (group && thread) await addTankButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Tank button pressed');
		break;
	case 'addLust':
		if (group && thread) await addLustButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Lust button pressed');
		break;
	case 'addBres':
		if (group && thread) await addBresButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Bres button pressed');
		break;
	case 'addFinish':
		if (group && thread) await finishDungeonButtonHandler(interaction, group, user, thread);
		await interaction.deferUpdate();
		break;
	case 'addClearRole':
		if (group && thread) await clearRoleButtonHandler(client, groupId, user);
		await interaction.deferUpdate();
		console.log('Add Clear Role button pressed');
		break;
	default:
		console.log('Unknown button pressed');
	}
};