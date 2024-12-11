import { LogLevel } from '../../enums';
import chalk from 'chalk';
import { Logtail } from '@logtail/node';
import dotenv from 'dotenv';

dotenv.config();
let logtail: Logtail;
try {
	if (process.env.LOGTAIL_SOURCE_TOKEN) {
		console.warn('Logger initialized');
	}
	else {
		console.warn('Logtail source token is not set.');
	}
	logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN ?? '' as string);
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
		logtail.debug(msg);
		break;
	case LogLevel.INFO:
		console.log(chalk.grey(`${prefix}| ${guildId ?? 'Server unknown'} | INFO]: ${ msg }`));
		logtail.info(msg);
		break;
	case LogLevel.WARN:
		console.log(chalk.yellow(`${prefix}| ${guildId ?? 'Server unknown'} | WARN]: ${ msg }`));
		logtail.warn(msg);
		break;
	case LogLevel.ERROR:
		console.log(chalk.red(`${prefix}| ${guildId ?? 'Server unknown'} | ERROR]: ${ msg }`));
		logtail.error(msg);
		break;
	case LogLevel.HIGHLIGHT:
		console.log(`${prefix}| ${guildId ?? 'Server unknown'} | HIGHLIGHT]: ${ chalk.bgYellow(msg) }`);
		logtail.log(msg);
		break;
	default:
		console.log(chalk.bgBlue(`${prefix}| ${guildId ?? 'Server unknown'} | LOG]: ${ msg }`));
		logtail.log(msg);
		break;
	}
	logtail.flush();
};