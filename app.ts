import { ButtonInteraction, ChatInputCommandInteraction, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { processModalSubmit, addEmbedButtons, handleButtonInteraction, updateEmbedField } from './services/';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';
import { GroupModel } from './models/group';
import { addEmbed } from './services/embed/add-embed';
import { registerCommands, processInteractionResponse } from './services/command';
import { getMessageByMessageId, reactToMessage } from './utils';
import { ModalField } from './enums';
import { archiveAndDeleteThreadAndEmbed } from './utils/tasks';

dotenv.config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
	console.log(`Logged in as ${readyClient.user?.tag}`);
	await mongooseConnectionHelper();
	await registerCommands();
	const groups = await GroupModel.find();
	for (const group of groups) {
		await reactToMessage(client, group);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isCommand()) {
		console.log(`Interaction received: ${interaction.commandName}`);
		if (interaction.commandName === 'lfm') await processInteractionResponse(interaction as ChatInputCommandInteraction);
	}
	if (interaction.isModalSubmit()) {
		const groupId = interaction.customId.match(/\[(.*?)\]/)?.[1];
		const model = await GroupModel.findOne({ groupId });
		const modalData = await processModalSubmit(interaction);
		if (!modalData) {
			console.error('Failed to process modal submit');
			return;
		}
		const { groupMessage, epochTimestamp, notes } = modalData;
		console.log('Group message id:', groupMessage?.id);

		console.log({ modalData });


		await model?.updateOne({ messageId: groupMessage?.id });
		await addEmbed(client, groupId ?? '', interaction.user.id);
		await addEmbedButtons(client, groupId ?? '');

		const msg = await getMessageByMessageId(client, groupMessage?.id ?? '', model?.guildId ?? '', model?.channelId ?? '');

		console.log({ fields: msg?.embeds[0].fields });

		await updateEmbedField(msg, ModalField.StartTime, interaction.user.id, epochTimestamp);
		await updateEmbedField(msg, ModalField.Notes, interaction.user.id, notes);
	}
	if (interaction.isButton()) {
		console.log('Button interaction:', interaction.customId);
		const matchResult = interaction.customId.match(/^([^[]+)\[([^\]]+)\]/);
		const buttonAction = matchResult?.[1];
		const groupId = matchResult?.[2];
		await handleButtonInteraction(buttonAction ?? '', groupId ?? '', interaction.user, client, interaction as ButtonInteraction);
	}

});

setInterval(async () => {
	try {
		await archiveAndDeleteThreadAndEmbed(client);
		console.log('Successfully deleted and closed threads');
	}
	catch (error) {
		console.error('Error deleting and closing threads:', error);
	}
}, 300000);

client.login(process.env.DISCORD_BOT_TOKEN!);
