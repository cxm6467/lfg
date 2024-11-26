import { LogLevel } from '../../enums';
import chalk from 'chalk';

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