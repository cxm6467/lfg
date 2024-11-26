import { ModalSubmitInteraction } from 'discord.js';
import { GroupModel } from '../../models/group';
import { parseDate } from 'chrono-node';
import { IProssesedModalData } from '../../interfaces';
import { TIME_ZONE_MAPPING } from '../../consts';
import { DateTime } from 'luxon';

export const processModalSubmit = async (interaction: ModalSubmitInteraction): Promise<IProssesedModalData | undefined> => {
	const { customId, fields } = interaction;

	// Extract values from the submitted modal
	const startTime = fields.getTextInputValue('start-time');
	const timeZoneAbbr = fields.getTextInputValue('tz');
	const notes = fields.getTextInputValue('notes');
	const groupId = customId.match(/\[(.*?)\]/)?.[1];

	// Get the IANA time zone from the abbreviation or fallback to UTC if not found
	const timeZone = TIME_ZONE_MAPPING[timeZoneAbbr.toUpperCase()] ?? 'UTC';
	console.log(`Using time zone: ${timeZone} for abbreviation: ${timeZoneAbbr}`);

	let epochTimestamp;

	// Find the group using the extracted groupId
	const group = await GroupModel.findOne({ groupId });

	if (groupId) {
		console.log(`Group ID: ${groupId}, Group found: ${!!group}`);

		const groupMessage = await interaction.reply({
			content: `Processing your submission for groupId: [${groupId}]`,
			fetchReply: true,
		});

		if (group) {
			// Use chrono-node to parse the start time (without timezone info)
			console.log(`Start time: ${startTime}`);
			const parsedStartTime = DateTime.fromJSDate(parseDate(startTime) ?? new Date());


			// Check if `parsedStartTime` is valid
			if (parsedStartTime) {
				console.log(`Parsed start time (local): ${parsedStartTime}`);


				// Adjust the parsed date to the specified time zone using moment-timezone
				const adjustedStartTime = parsedStartTime.setZone(TIME_ZONE_MAPPING[timeZoneAbbr.toUpperCase()] ?? 'UTC');
				console.log(`Adjusted start time with time zone (${timeZone}): ${adjustedStartTime}`);

				// Check if the final date is a valid date
				if (isNaN(adjustedStartTime.toUnixInteger())) {
					console.error('Invalid date detected after time zone adjustment');
					return;
				}

				// Store the adjusted start time in the group
				group.startTime = adjustedStartTime.toJSDate();
				epochTimestamp = adjustedStartTime.toJSDate().getTime();

			}
			else {
				console.log('Failed to parse start time using chrono-node');
			}

			// Add the notes to the group
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
			console.log(`Group with ID ${groupId} not found`);
		}
	}
	else {
		console.log('Group ID not found in customId');
	}
};

