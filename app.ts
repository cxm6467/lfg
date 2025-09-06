import { ButtonInteraction, ChatInputCommandInteraction, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { processModalSubmit, addEmbedButtons, handleButtonInteraction, updateEmbedField } from './services/';
import { mongooseConnectionHelper } from './services/mongoose-connection-helper';
import { GroupModel } from './models/group';
import { addEmbed } from './services/embed/add-embed';
import { registerCommands, processInteractionResponse, processHelpCommand, processJoinCommand, processLeaveCommand, processGroupsCommand, processMyGroupsCommand, processRefreshDungeonsCommand, processSetBattleTagCommand, processSetMainCommand, processProfileCommand, processRefreshProfileCommand, processSetLfmChannelCommand, processLinkGuildCommand, processUnlinkGuildCommand, processGuildConfigCommand, processCleanupCommand, processSetFallbackCommand, processRefreshSeasonCommand, processTTSStatusCommand } from './services/command';
import { getMessageByMessageId, logger } from './utils';
import { LogLevel, ModalField } from './enums';
import { archiveAndDeleteThreadAndEmbed } from './utils/tasks';
import { battleNetAPI } from './services/wow-api/battle-net-api';
import { StartupCleanupService } from './services/startup/startup-cleanup';
import { XpostingService } from './services/guild/xposting-service';

dotenv.config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
	logger(LogLevel.INFO, `Logged in as ${readyClient.user?.tag}`);
	await mongooseConnectionHelper();
	await registerCommands();

	// Load and display current M+ season dungeons
	try {
		const dungeons = await battleNetAPI.getCurrentSeasonDungeons();
		if (dungeons.length > 0) {
			logger(LogLevel.INFO, `Current M+ Season Dungeons (${dungeons.length}):`);
			dungeons.forEach(dungeon => {
				logger(LogLevel.INFO, `  - ${dungeon.name} (ID: ${dungeon.id})`);
			});
		}
		else {
			logger(LogLevel.WARN, 'No current season dungeons found');
		}
	}
	catch (error) {
		logger(LogLevel.ERROR, `Failed to load M+ season dungeons: ${(error as Error).message}`);
	}

	// Perform startup cleanup
	await StartupCleanupService.performStartupCleanup(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isCommand()) {
		logger(LogLevel.DEBUG, `Interaction received: ${interaction.commandName}`);
		if (interaction.commandName === 'lfm') await processInteractionResponse(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'help') await processHelpCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'join') await processJoinCommand(interaction as ChatInputCommandInteraction, client);
		if (interaction.commandName === 'leave') await processLeaveCommand(interaction as ChatInputCommandInteraction, client);
		if (interaction.commandName === 'groups') await processGroupsCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'mygroups') await processMyGroupsCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'refresh-dungeons') await processRefreshDungeonsCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'set-battletag') await processSetBattleTagCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'set-main') await processSetMainCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'profile') await processProfileCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'refresh-profile') await processRefreshProfileCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'set-lfm-channel') await processSetLfmChannelCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'link-guild') await processLinkGuildCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'unlink-guild') await processUnlinkGuildCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'guild-config') await processGuildConfigCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'cleanup') await processCleanupCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'set-fallback') await processSetFallbackCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'refresh-season') await processRefreshSeasonCommand(interaction as ChatInputCommandInteraction);
		if (interaction.commandName === 'tts-status') await processTTSStatusCommand(interaction as ChatInputCommandInteraction);
	}
	if (interaction.isModalSubmit()) {
		const groupId = interaction.customId.match(/\[(.*?)\]/)?.[1];
		const model = await GroupModel.findOne({ groupId });
		let modalData;
		try {
			modalData = await processModalSubmit(interaction);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error processing modal submit: ${(error as Error).message}`);
			return;
		}
		if (!modalData) {
			logger(LogLevel.ERROR, 'Failed to process modal submit');
			return;
		}
		const { groupMessage, epochTimestamp, notes } = modalData;
		logger(LogLevel.INFO, `Group message id: ${groupMessage?.id}`);

		logger(LogLevel.DEBUG, `Modal data: ${JSON.stringify(modalData)}`);
		logger(LogLevel.DEBUG, `timestamp: ${epochTimestamp} => ${new Date(epochTimestamp! * 1000)}`);
		await model?.updateOne({ messageId: groupMessage?.id, startTime: new Date(epochTimestamp! * 1000), notes });
		await addEmbed(client, groupId ?? '', interaction.user.id);
		await addEmbedButtons(client, groupId ?? '', interaction?.guild?.id ?? '');

		const msg = await getMessageByMessageId(client, groupMessage?.id ?? '', model?.guildId ?? '', model?.channelId ?? '');

		logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(msg?.embeds[0]?.fields)}`);

		await updateEmbedField(msg, ModalField.StartTime, interaction.user.id, epochTimestamp);
		await updateEmbedField(msg, ModalField.Notes, interaction.user.id, notes);
		
		// Post to linked guilds if x-posting is enabled
		await XpostingService.postToLinkedGuilds(client, groupId ?? '');
	}
	if (interaction.isButton()) {
		logger(LogLevel.INFO, `Button interaction: ${interaction.customId}`);
		const matchResult = interaction.customId.match(/^([^[]+)\[([^\]]+)\]/);
		const buttonAction = matchResult?.[1];
		const groupId = matchResult?.[2];
		await handleButtonInteraction(buttonAction ?? '', groupId ?? '', interaction.user, client, interaction as ButtonInteraction);
	}

});

// Run reminder system every 2 minutes to ensure we don't miss warning windows
setInterval(async () => {
	try {
		logger(LogLevel.DEBUG, '🔄 Running reminder system check...');
		await archiveAndDeleteThreadAndEmbed(client);
		logger(LogLevel.DEBUG, '✅ Reminder system check completed');
	}
	catch (error) {
		logger(LogLevel.ERROR, `❌ Error in reminder system: ${JSON.stringify(error)}`);
	}
}, 120000); // 2 minutes instead of 5 minutes

client.login(process.env.DISCORD_BOT_TOKEN!);
