import { ButtonInteraction, ChatInputCommandInteraction, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { processModalSubmit, addEmbedButtons, handleButtonInteraction, updateEmbedField } from './services/';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';
import { GroupModel } from './models/group';
import { addEmbed } from './services/embed/add-embed';
import { registerCommands, processInteractionResponse } from './services/command';
import { getMessageByMessageId, logger, reactToMessage } from './utils';
import { LogLevel, ModalField } from './enums';
import { archiveAndDeleteThreadAndEmbed } from './utils/tasks';

dotenv.config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
	logger(LogLevel.INFO, `Logged in as ${readyClient.user?.tag}`);
	await mongooseConnectionHelper();
	await registerCommands();
	const groups = await GroupModel.find({ archived: { $ne: true } });
	for (const group of groups) {
		await reactToMessage(client, group);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isCommand()) {
		logger(LogLevel.DEBUG, `Interaction received: ${interaction.commandName}`);
		if (interaction.commandName === 'lfm') await processInteractionResponse(interaction as ChatInputCommandInteraction);
	}
	if (interaction.isModalSubmit()) {
		const groupId = interaction.customId.match(/\[(.*?)\]/)?.[1];
		const model = await GroupModel.findOne({ groupId });
		const modalData = await processModalSubmit(interaction);
		if (!modalData) {
			logger(LogLevel.ERROR, 'Failed to process modal submit');
			return;
		}
		const { groupMessage, epochTimestamp, notes } = modalData;
		logger(LogLevel.INFO, `Group message id: ${groupMessage?.id}`);

		logger(LogLevel.DEBUG, `Modal data: ${JSON.stringify(modalData)}`);


		await model?.updateOne({ messageId: groupMessage?.id });
		await addEmbed(client, groupId ?? '', interaction.user.id);
		await addEmbedButtons(client, groupId ?? '');

		const msg = await getMessageByMessageId(client, groupMessage?.id ?? '', model?.guildId ?? '', model?.channelId ?? '');

		logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(msg?.embeds[0].fields)}`);

		await updateEmbedField(msg, ModalField.StartTime, interaction.user.id, epochTimestamp);
		await updateEmbedField(msg, ModalField.Notes, interaction.user.id, notes);
	}
	if (interaction.isButton()) {
		logger(LogLevel.INFO, `Button interaction: ${interaction.customId}`);
		const matchResult = interaction.customId.match(/^([^[]+)\[([^\]]+)\]/);
		const buttonAction = matchResult?.[1];
		const groupId = matchResult?.[2];
		await handleButtonInteraction(buttonAction ?? '', groupId ?? '', interaction.user, client, interaction as ButtonInteraction);
	}

});

setInterval(async () => {
	try {
		await archiveAndDeleteThreadAndEmbed(client);
		logger(LogLevel.INFO, 'Successfully processed groups');
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error deleting and closing threads: ${JSON.stringify(error)}`);
	}
}, 300000);

client.login(process.env.DISCORD_BOT_TOKEN!);
