import { LogLevel } from '../../enums';
import chalk from 'chalk';
import { Logtail } from '@logtail/node';
import dotenv from 'dotenv';

dotenv.config();

// Declare logtail as a potentially undefined variable initially
let logtail: Logtail | undefined;

if (process.env.LOGTAIL_SOURCE_TOKEN) {
	try {
		logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
		console.warn('Logger initialized');
	}
	catch (error) {
		console.error('Failed to initialize Logtail:', error);
	}
}
else {
	console.warn('Logtail source token is not set.');
}

/**
 * Logs a message with a specified log level and a timestamp prefix.
 *
 * @param {LogLevel} level - The log level of the message (DEBUG, INFO, WARN, ERROR).
 * @param {string} msg - The message to log.
 * @param {string} [guildId] - Optional guild ID for the log message.
 */
export const logger = (level: LogLevel, msg: string, guildId?: string) => {
	const prefix = `[${new Date().toISOString()}] | ${guildId ?? 'Server unknown'}`;

	// Log the message to the console using different colors based on the level
	const logMessage = `${prefix} | ${level}]: ${msg}`;

	switch (level) {
	case LogLevel.DEBUG:
		console.log(chalk.magenta(logMessage));
		break;
	case LogLevel.INFO:
		console.log(chalk.grey(logMessage));
		break;
	case LogLevel.WARN:
		console.log(chalk.yellow(logMessage));
		break;
	case LogLevel.ERROR:
		console.log(chalk.red(logMessage));
		break;
	case LogLevel.HIGHLIGHT:
		console.log(`${logMessage} ${chalk.bgYellow(msg)}`);
		break;
	default:
		console.log(chalk.bgBlue(logMessage));
		break;
	}

	// If Logtail is initialized, send the log to it
	if (logtail) {
		switch (level) {
		case LogLevel.DEBUG:
			logtail.debug(msg);
			break;
		case LogLevel.INFO:
			logtail.info(msg);
			break;
		case LogLevel.WARN:
			logtail.warn(msg);
			break;
		case LogLevel.ERROR:
			logtail.error(msg);
			break;
		case LogLevel.HIGHLIGHT:
			logtail.log(msg);
			break;
		default:
			logtail.log(msg);
			break;
		}
		logtail.flush();
	}
};
