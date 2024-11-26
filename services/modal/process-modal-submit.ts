import { ModalSubmitInteraction } from 'discord.js';
import { GroupModel } from '../../models/group';
import { parseDate } from 'chrono-node';
import { IProssesedModalData } from '../../interfaces';
import { TIME_ZONE_MAPPING } from '../../consts';
import { DateTime } from 'luxon';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';

/**
 * Processes the modal submit interaction from Discord.
 *
 * @param interaction - The modal submit interaction from Discord.
 * @returns A promise that resolves to an `IProssesedModalData` object containing the processed data, or `undefined` if an error occurs.
 *
 * The function performs the following steps:
 * 1. Extracts the custom ID and fields from the interaction.
 * 2. Retrieves the start time, time zone abbreviation, notes, and group ID from the fields.
 * 3. Maps the time zone abbreviation to a full time zone name using `TIME_ZONE_MAPPING`.
 * 4. Logs the time zone being used.
 * 5. Finds the group in the database using the group ID.
 * 6. If the group is found, it parses and adjusts the start time to the specified time zone.
 * 7. Updates the group's start time and notes in the database.
 * 8. Returns an object containing the group message, epoch timestamp, time zone, and notes.
 *
 * If the group ID is not found in the custom ID or the group is not found in the database, appropriate warnings are logged.
 */
export const processModalSubmit = async (interaction: ModalSubmitInteraction): Promise<IProssesedModalData | undefined> => {
	const { customId, fields } = interaction;

	const startTime = fields.getTextInputValue('start-time');
	const timeZoneAbbr = fields.getTextInputValue('tz');
	const notes = fields.getTextInputValue('notes');
	const groupId = customId.match(/\[(.*?)\]/)?.[1];

	const timeZone = TIME_ZONE_MAPPING[timeZoneAbbr.toUpperCase()] ?? 'UTC';
	logger(LogLevel.INFO, `Using time zone: ${timeZone} for abbreviation: ${timeZoneAbbr}`);

	let epochTimestamp;

	const group = await GroupModel.findOne({ groupId });

	if (groupId) {
		logger(LogLevel.INFO, `Group ID: ${groupId}, Group found: ${!!group}`);

		const groupMessage = await interaction.reply({
			content: `Processing your submission for groupId: [${groupId}]`,
			fetchReply: true,
		});

		if (group) {
			logger(LogLevel.INFO, `Start time: ${startTime}`);
			const parsedStartTime = DateTime.fromJSDate(parseDate(startTime) ?? new Date());

			if (parsedStartTime) {
				logger(LogLevel.INFO, `Parsed start time (local): ${parsedStartTime}`);


				const adjustedStartTime = parsedStartTime.setZone(TIME_ZONE_MAPPING[timeZoneAbbr.toUpperCase()] ?? 'UTC');
				logger(LogLevel.INFO, `Adjusted start time with time zone (${timeZone}): ${adjustedStartTime}`);

				if (isNaN(adjustedStartTime.toUnixInteger())) {
					logger(LogLevel.ERROR, 'Invalid date detected after time zone adjustment');
					return;
				}

				group.startTime = adjustedStartTime.toJSDate();
				epochTimestamp = adjustedStartTime.toJSDate().getTime();

			}
			else {
				logger(LogLevel.ERROR, 'Failed to parse start time using chrono-node');
			}

			group.notes = notes;

			await group.save();

			return {
				groupMessage,
				epochTimestamp,
				timeZone,
				notes,
			} as IProssesedModalData;
		}
		else {
			logger(LogLevel.WARN, `Group with ID ${groupId} not found`);
		}
	}
	else {
		logger(LogLevel.WARN, 'Group ID not found in customId');
	}
};

