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
	logger(LogLevel.INFO, `Logged in as ${readyClient.user?.tag}`, readyClient.guilds.cache.map((guild) => guild.name).join(', '));
	await mongooseConnectionHelper();
	await registerCommands();
	const groups = await GroupModel.find({ archived: { $ne: true } });
	for (const group of groups) {
		await reactToMessage(client, group);
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isCommand()) {
		logger(LogLevel.DEBUG, `Interaction received: ${interaction.commandName}`, interaction.guild?.id);
		if (interaction.commandName === 'lfm') await processInteractionResponse(interaction as ChatInputCommandInteraction);
	}
	if (interaction.isModalSubmit()) {
		const groupId = interaction.customId.match(/\[(.*?)\]/)?.[1];
		const model = await GroupModel.findOne({ groupId });
		let modalData;
		try {
			modalData = await processModalSubmit(interaction);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error processing modal submit: ${(error as Error).message}`, interaction.guild?.id);
			return;
		}
		if (!modalData) {
			logger(LogLevel.ERROR, 'Failed to process modal submit', interaction.guild?.id);
			return;
		}
		const { groupMessage, epochTimestamp, notes } = modalData;
		logger(LogLevel.INFO, `Group message id: ${groupMessage?.id}`, interaction.guild?.id);

		logger(LogLevel.DEBUG, `Modal data: ${JSON.stringify(modalData)}`, interaction.guild?.id);
		logger(LogLevel.DEBUG, `timestamp: ${epochTimestamp} => ${new Date(epochTimestamp! * 1000)}`, interaction.guild?.id);
		await model?.updateOne({ messageId: groupMessage?.id, startTime: new Date(epochTimestamp! * 1000), notes });
		await addEmbed(client, groupId ?? '', interaction.user.id);
		await addEmbedButtons(client, groupId ?? '', interaction?.guild?.id ?? '');

		const msg = await getMessageByMessageId(client, groupMessage?.id ?? '', model?.guildId ?? '', model?.channelId ?? '');

		logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(msg?.embeds[0]?.fields)}`, interaction.guild?.id);

		await updateEmbedField(msg, ModalField.StartTime, interaction.user.id, epochTimestamp);
		await updateEmbedField(msg, ModalField.Notes, interaction.user.id, notes);
	}
	if (interaction.isButton()) {
		logger(LogLevel.INFO, `Button interaction: ${interaction.customId}`, interaction.guild?.id);
		const matchResult = interaction.customId.match(/^([^[]+)\[([^\]]+)\]/);
		const buttonAction = matchResult?.[1];
		const groupId = matchResult?.[2];
		await handleButtonInteraction(buttonAction ?? '', groupId ?? '', interaction.user, client, interaction as ButtonInteraction);
	}

});

setInterval(async () => {
	try {
		await archiveAndDeleteThreadAndEmbed(client);
		logger(LogLevel.INFO, 'Successfully processed groups', client.guilds.cache.map((guild) => guild.name).join(', '));
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error deleting and closing threads: ${JSON.stringify(error)}`, client.guilds.cache.map((guild) => guild.name).join(', '));
	}
}, 60000);

client.login(process.env.DISCORD_BOT_TOKEN!);
