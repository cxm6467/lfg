import { LogLevel } from '../../enums';
import chalk from 'chalk';

/**
 * Logs a message with a specified log level and a timestamp prefix.
 *
 * @param {LogLevel} level - The log level of the message (DEBUG, INFO, WARN, ERROR).
 * @param {string} msg - The message to log.
 */
export const logger = (level: LogLevel, msg: string) => {
	const prefix = `[${new Date().getTime()}]:`;

	switch (level) {
	case LogLevel.DEBUG:
		console.log(chalk.cyan(`${prefix} [DEBUG]: ${msg}`));
		break;
	case LogLevel.INFO:
		console.log(chalk.white(`${ prefix } [INFO]: ${ msg }`));
		break;
	case LogLevel.WARN:
		console.log(chalk.yellow`${ prefix } [WARN]: ${ msg }`);
		break;
	case LogLevel.ERROR:
		console.log(chalk.red(`${ prefix } [ERROR]: ${ msg }`));
		break;
	default:
		console.log(chalk.grey(`${ prefix } INFO: ${ msg }`));
		break;
	}
};