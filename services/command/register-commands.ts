import { REST, Routes } from 'discord.js';
import { commands, logger } from '../../utils';
import { LogLevel } from '../../enums';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

export const registerCommands = async () => {
	try {
		logger(LogLevel.INFO, 'Started refreshing application (/) commands globally.');
		await rest.put(
			Routes.applicationCommands(process.env.DISCORD_BOT_APP_ID!),
			{ body: commands },
		);
		logger(LogLevel.INFO, 'Successfully reloaded application (/) commands globally.');

	}
	catch (error) {
		logger(LogLevel.ERROR, `${error}`);
	}
};