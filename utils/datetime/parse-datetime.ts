import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';
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

	// Try chrono-node first for natural language parsing
	try {
		const parsedResults = chrono.parse(normalizedInput, { timezone: timeZone });
		if (parsedResults.length > 0) {
			const chronoResult = parsedResults[0];
			const jsDate = chronoResult.start.date();

			// Convert to Luxon DateTime in the specified timezone
			const luxonDate = DateTime.fromJSDate(jsDate).setZone(timeZone);

			if (luxonDate.isValid) {
				logger(LogLevel.DEBUG, `Parsed with chrono-node: ${luxonDate.toString()}`);
				const unixTimestamp = Math.floor(luxonDate.toSeconds());
				logger(LogLevel.DEBUG, `Unix timestamp: ${unixTimestamp}`);
				return unixTimestamp;
			}
		}
	}
	catch (chronoError) {
		logger(LogLevel.DEBUG, `Chrono-node parsing failed: ${(chronoError as Error).message}`);
	}

	// Fallback to Luxon format parsing
	const formats = [
		// 24-hour formats (without AM/PM)
		'M/d/yyyy H:mm',
		'M/d/yyyy HH:mm',
		'MM/d/yyyy H:mm',
		'MM/d/yyyy HH:mm',
		'M/dd/yyyy H:mm',
		'M/dd/yyyy HH:mm',
		'MM/dd/yyyy H:mm',
		'MM/dd/yyyy HH:mm',
		'M-d-yyyy H:mm',
		'M-d-yyyy HH:mm',
		'MM-d-yyyy H:mm',
		'MM-d-yyyy HH:mm',
		'M-dd-yyyy H:mm',
		'M-dd-yyyy HH:mm',
		'MM-dd-yyyy H:mm',
		'MM-dd-yyyy HH:mm',
		// 12-hour formats (with AM/PM)
		'M/d/yyyy h:mm a',
		'M/d/yyyy hh:mm a',
		'MM/d/yyyy h:mm a',
		'MM/d/yyyy hh:mm a',
		'M/dd/yyyy h:mm a',
		'M/dd/yyyy hh:mm a',
		'MM/dd/yyyy h:mm a',
		'MM/dd/yyyy hh:mm a',
		'M-d-yyyy h:mm a',
		'M-d-yyyy hh:mm a',
		'MM-d-yyyy h:mm a',
		'MM-d-yyyy hh:mm a',
		'M-dd-yyyy h:mm a',
		'M-dd-yyyy hh:mm a',
		'MM-dd-yyyy h:mm a',
		'MM-dd-yyyy hh:mm a',
		// Additional flexible formats
		'h:mm M/d/yyyy',
		'h:mm a M/d/yyyy',
		'H:mm M/d/yyyy',
	];
	let parsedDate: DateTime | null = null;

	for (const format of formats) {
		try {
			parsedDate = DateTime.fromFormat(normalizedInput, format, { zone: timeZone });
		}
		catch (error) {
			continue;
		}
		if (parsedDate.isValid) {
			logger(LogLevel.DEBUG, `Parsed DateTime with format '${format}': ${parsedDate.toString()}`);
			break;
		}
	}

	if (!parsedDate || !parsedDate.isValid) {
		throw new Error(`Invalid date: Could not parse '${normalizedInput}' into a valid DateTime object.`);
	}

	const unixTimestamp = Math.floor(parsedDate.toSeconds());
	logger(LogLevel.DEBUG, `UTC DateTime: ${parsedDate.toString()}, Unix timestamp: ${unixTimestamp}`);
	return unixTimestamp;
};

