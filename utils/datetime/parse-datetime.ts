/* eslint-disable no-multi-spaces */
/* eslint-disable no-inline-comments */
import { DateTime } from 'luxon';

/**
 * Parses a date-time string into a DateTime object using various formats and time zones.
 *
 * @param input - The date-time string to parse.
 * @param timeZone - The time zone to use for parsing.
 * @returns A DateTime object representing the parsed date-time.
 * @throws Will throw an error if the input string does not match any of the expected formats.
 */
export const parseDateTime = (input: string, timeZone: string): DateTime => {
	const possibleFormats = [
		'MM/dd/yyyy h:mm a',    // e.g., 12/01/2024 1:00 PM
		'yyyy-MM-dd HH:mm',     // e.g., 2024-12-01 13:00
		'MMMM d, yyyy h:mm a',  // e.g., December 1, 2024 1:00 PM
		'MM/dd/yyyy HH:mm',     // e.g., 12/01/2024 13:00
	];

	for (const format of possibleFormats) {
		const dateTime = DateTime.fromFormat(input, format, { zone: timeZone });
		if (dateTime.isValid) {
			return dateTime;
		}
	}

	const isoDateTime = DateTime.fromISO(input, { zone: timeZone });
	if (isoDateTime.isValid) {
		return isoDateTime;
	}

	const fallbackDateTime = DateTime.fromJSDate(new Date(input), { zone: timeZone });
	if (fallbackDateTime.isValid) {
		return fallbackDateTime;
	}

	throw new Error(`Invalid date/time format: ${input}`);
};