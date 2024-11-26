import { REST, Routes } from 'discord.js';
import { commands } from '../../utils';

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

export const registerCommands = async () => {
	try {
		logger('Started refreshing application (/) commands globally.');
		await rest.put(
			Routes.applicationCommands(process.env.DISCORD_BOT_APP_ID!),
			{ body: commands },
		);
		logger('Successfully reloaded application (/) commands globally.');

	}
	catch (error) {
		logger(error);
	}
};