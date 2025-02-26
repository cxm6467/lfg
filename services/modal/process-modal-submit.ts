import { ModalSubmitInteraction } from 'discord.js';
import { GroupModel } from '../../models/group';
import { IProssesedModalData } from '../../interfaces';
import { TIME_ZONE_MAPPING } from '../../consts';
import { LogLevel } from '../../enums';
import { formatDungeonDateTime, getUnixTimestamp, logger, mentionHelper } from '../../utils';

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

	if (!groupId) {
		logger(LogLevel.WARN, 'Group ID not found in customId');
		return;
	}

	const group = await GroupModel.findOne({ groupId });
	if (!group) {
		logger(LogLevel.WARN, `Group with ID ${groupId} not found`);
		return;
	}

	try {
		logger(LogLevel.INFO, `Parsing start time: ${startTime}`);
		const parsedDateTime = await formatDungeonDateTime(startTime, timeZone);

		logger(LogLevel.INFO, `Successfully parsed start time: ${parsedDateTime.toString()}`);

		const mongoTimestamp = getUnixTimestamp(startTime, timeZone);

		logger(LogLevel.INFO, `MongoDB timestamp: ${new Date(mongoTimestamp)}`);
		logger(LogLevel.INFO, `Discord timestamp: ${parsedDateTime}`);

		if (new Date(mongoTimestamp).getTime() === 0) {
			interaction.reply({	content: `Invalid time provided, ${startTime}. Please use MM/DD/YYYY HH:MM AM/PM format, e.g., 02/17/2025 03:30 PM`, ephemeral: true });
		}

		group.startTime = new Date(mongoTimestamp);
		group.notes = notes;
		await group.save();

		const initialMemberRole = group.members?.find(member => member.userId === interaction.user.id)?.role;

		const mentions = mentionHelper(group.guildId ?? '', initialMemberRole, group.dungeon.type);
		const groupMessage = await interaction.reply({
			content: `${mentions?.join(' ')}`,
			fetchReply: true,
		});

		return {
			groupMessage,
			epochTimestamp: mongoTimestamp,
			timeZone,
			notes,
		} as IProssesedModalData;
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error processing modal submit: ${error as Error}`);
		return;
	}
};
