import { LogLevel } from '../../enums';
import chalk from 'chalk';
import { Logtail } from '@logtail/node';
import dotenv from 'dotenv';

dotenv.config();
let logtail: Logtail | null = null;
try {
	if (process.env.LOGTAIL_SOURCE_TOKEN && process.env.ENABLE_LOGTAIL === 'true') {
		console.warn('Logger initialized with Logtail');
		logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN ?? '' as string);
	}
	else {
		console.warn('Logtail disabled or token not set.');
	}
}
catch (error) {
	console.error('Failed to initialize logger:', error);
}

/**
 * Logs a message with a specified log level and a timestamp prefix.
 *
 * @param {LogLevel} level - The log level of the message (DEBUG, INFO, WARN, ERROR).
 * @param {string} msg - The message to log.
 */
export const logger = (level: LogLevel, msg: string, guildId ?:string) => {
	const prefix = `[${new Date().toISOString()} `;

	switch (level) {
	case LogLevel.DEBUG:
		console.log(chalk.magenta(`${prefix} | DEBUG]: ${msg}`));
		if (logtail) logtail.debug(msg);
		break;
	case LogLevel.INFO:
		console.log(chalk.grey(`${prefix} | INFO]: ${ msg }`));
		if (logtail) logtail.info(msg);
		break;
	case LogLevel.WARN:
		console.log(chalk.yellow(`${prefix} | WARN]: ${ msg }`));
		if (logtail) logtail.warn(msg);
		break;
	case LogLevel.ERROR:
		console.log(chalk.red(`${prefix} | ERROR]: ${ msg }`));
		if (logtail) logtail.error(msg);
		break;
	case LogLevel.HIGHLIGHT:
		console.log(`${prefix} | HIGHLIGHT]: ${ chalk.bgYellow(msg) }`);
		if (logtail) logtail.log(msg);
		break;
	default:
		console.log(chalk.bgBlue(`${prefix} | LOG]: ${ msg }`));
		if (logtail) logtail.log(msg);
		break;
	}
	if (logtail) logtail.flush();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	guildId = '';
};