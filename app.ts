import { ButtonInteraction, ChatInputCommandInteraction, Events } from 'discord.js';
import { processModalSubmit, addEmbedButtons, handleButtonInteraction, updateEmbedField } from './services/';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';
import { GroupModel } from './models/group';
import { addEmbed } from './services/embed/add-embed';
import { registerCommands, processInteractionResponse } from './services/command';
import { getMessageByMessageId, logger } from './utils';
import { LogLevel, ModalField } from './enums';
import { archiveAndDeleteThreadAndEmbed } from './utils/tasks';
import { config } from './services/config';
import { discordClient } from './services/discord-client';
import { asyncErrorHandler } from './utils/error-handler';
import { performanceMonitor } from './services/monitoring';

// Initialize the Discord client
const client = discordClient.createClient();

client.once(Events.ClientReady, async (readyClient) => {
	logger(LogLevel.INFO, `Logged in as ${readyClient.user?.tag}`);
	await mongooseConnectionHelper();
	await registerCommands();
	// const groups = await GroupModel.find({ archived: { $ne: true } });
	// for (const group of groups) {
	// 	await reactToMessage(client, group);
	// }
});

client.on(Events.InteractionCreate, asyncErrorHandler(async (interaction) => {
	if (interaction.isCommand()) {
		logger(LogLevel.DEBUG, `Interaction received: ${interaction.commandName}`);
		if (interaction.commandName === 'lfm') {
			await processInteractionResponse(interaction as ChatInputCommandInteraction);
		}
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
		logger(LogLevel.DEBUG, `timestamp: ${epochTimestamp} => ${new Date(epochTimestamp! * 1000)}`);
		
		await model?.updateOne({
			messageId: groupMessage?.id,
			startTime: new Date(epochTimestamp! * 1000),
			notes
		});
		
		await addEmbed(client, groupId ?? '', interaction.user.id);
		await addEmbedButtons(client, groupId ?? '', interaction?.guild?.id ?? '');

		const msg = await getMessageByMessageId(
			client,
			groupMessage?.id ?? '',
			model?.guildId ?? '',
			model?.channelId ?? ''
		);

		logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(msg?.embeds[0]?.fields)}`);

		await updateEmbedField(msg, ModalField.StartTime, interaction.user.id, epochTimestamp);
		await updateEmbedField(msg, ModalField.Notes, interaction.user.id, notes);
	}
	
	if (interaction.isButton()) {
		logger(LogLevel.INFO, `Button interaction: ${interaction.customId}`);
		const matchResult = interaction.customId.match(/^([^[]+)\[([^\]]+)\]/);
		const buttonAction = matchResult?.[1];
		const groupId = matchResult?.[2];
		
		await handleButtonInteraction(
			buttonAction ?? '',
			groupId ?? '',
			interaction.user,
			client,
			interaction as ButtonInteraction
		);
	}
}));

setInterval(async () => {
	try {
		await archiveAndDeleteThreadAndEmbed(client);
		// logger(LogLevel.INFO, 'Successfully processed groups');
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error deleting and closing threads: ${config.sanitizeForLogging(error)}`);
	}
}, 300000);

// Initialize the Discord client and start the application
discordClient.initialize().catch((error) => {
	logger(LogLevel.ERROR, `Failed to initialize Discord client: ${config.sanitizeForLogging(error)}`);
	process.exit(1);
});

// Log application startup
logger(LogLevel.INFO, 'Discord LFG Bot starting up...', {
	nodeVersion: process.version,
	platform: process.platform,
	environment: config.isDevelopment ? 'development' : 'production',
});
