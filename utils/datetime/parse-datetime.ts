import { DateTime } from 'luxon';
import { TIME_ZONE_MAPPING } from '../../consts';
import { logger } from '../../utils/logger';
import { LogLevel } from '../../enums';

/**
 * Parses a datetime string in the provided time zone and returns a Discord timestamp.
 *
 * @param {string} dungeonDatetimeStr - The input datetime string.
 * @param {string} timeZone - The input time zone (e.g., "PST", "America/New_York").
 * @returns {string} - A Discord timestamp in the format `<t:unix:F>`.
 */
export const formatDungeonDateTime = async (dungeonDatetimeStr: string, timeZone: string = 'America/New_York') => {
	logger(LogLevel.DEBUG, `Received input datetime string: '${dungeonDatetimeStr}', time zone: ${timeZone}`);

	const tzName = TIME_ZONE_MAPPING[timeZone.toUpperCase()] || timeZone;
	if (!DateTime.local().setZone(tzName).isValid) {
		const error = `Invalid time zone code: ${timeZone}. Use valid IANA time zones.`;
		logger(LogLevel.ERROR, error);
		return '<t:0:F>';
	}

	try {
		const unixTimestamp = parseAndConvertToUnix(dungeonDatetimeStr, tzName);
		return unixTimestamp > 0 ? `<t:${unixTimestamp}:F>` : '<t:0:F>';
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error formatting datetime string: ${(error as Error).message}`);
		return '<t:0:F>';
	}
};

/**
 * Parses a datetime string in the provided time zone and returns a Unix timestamp.
 *
 * @param {string} dungeonDatetimeStr - The input datetime string.
 * @param {string} timeZone - The input time zone (e.g., "PST", "America/New_York").
 * @returns {number} - The Unix timestamp, or 0 on failure.
 */
export const getUnixTimestamp = (dungeonDatetimeStr: string, timeZone: string = 'America/New_York'): number => {
	logger(LogLevel.DEBUG, `Received input datetime string: '${dungeonDatetimeStr}', time zone: ${timeZone}`);

	const tzName = TIME_ZONE_MAPPING[timeZone.toUpperCase()] || timeZone;

	try {
		return parseAndConvertToUnix(dungeonDatetimeStr, tzName);
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error parsing datetime string: ${(error as Error).message}`);
		return 0;
	}
};

/**
 * Helper function to parse a datetime string and convert it to a Unix timestamp.
 *
 * @param {string} datetimeStr - The input datetime string.
 * @param {string} timeZone - The input time zone (IANA-compatible string).
 * @returns {number} - The Unix timestamp, or 0 on failure.
 */
const parseAndConvertToUnix = (datetimeStr: string, timeZone: string): number => {
	if (!datetimeStr || datetimeStr.trim() === '') {
		throw new Error('Invalid datetime input: The datetime string is empty or undefined.');
	}

	const normalizedInput = datetimeStr.trim();
	logger(LogLevel.DEBUG, `Normalized datetime string: '${normalizedInput}'`);

	const parsedDate = DateTime.fromFormat(normalizedInput, 'MM/dd/yyyy h:mm a', { zone: timeZone });

	if (!parsedDate.isValid) {
		throw new Error(`Invalid date: Could not parse '${normalizedInput}' into a valid DateTime object.`);
	}

	logger(LogLevel.DEBUG, `Parsed DateTime (time zone applied): ${parsedDate.toString()}`);

	const utcDate = parsedDate.toUTC();
	const unixTimestamp = Math.floor(utcDate.toSeconds());

	logger(LogLevel.DEBUG, `UTC DateTime: ${utcDate.toString()}, Unix timestamp: ${unixTimestamp}`);
	return unixTimestamp;
};
