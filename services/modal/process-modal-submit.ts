import { ModalSubmitInteraction } from "discord.js";
import { GroupModel } from "../../models/group";
import { parseDate } from "chrono-node";
import { IProssesedModalData } from "../../interfaces";
import moment from 'moment-timezone';

export const processModalSubmit = async (interaction: ModalSubmitInteraction): Promise<IProssesedModalData | undefined> => {
  const { customId, fields } = interaction;

  // Extract values from the submitted modal
  const startTime = fields.getTextInputValue('start-time');
  const timeZoneAbbr = fields.getTextInputValue('tz'); // Timezone abbreviation input from the user
  const notes = fields.getTextInputValue('notes');
  const groupId = customId.match(/\[(.*?)\]/)?.[1];

  // Define a mapping of common US time zone abbreviations to IANA time zones
  const timezoneMap: Record<string, string> = {
    EST: 'America/New_York',
    EDT: 'America/New_York',
    CST: 'America/Chicago',
    CDT: 'America/Chicago',
    MST: 'America/Denver',
    MDT: 'America/Denver',
    PST: 'America/Los_Angeles',
    PDT: 'America/Los_Angeles',
    AKST: 'America/Anchorage', // Alaska Standard Time
    AKDT: 'America/Anchorage', // Alaska Daylight Time
    HST: 'Pacific/Honolulu',   // Hawaii Standard Time
  };

  // Get the IANA time zone from the abbreviation or fallback to UTC if not found
  const timeZone = timezoneMap[timeZoneAbbr.toUpperCase()] ?? 'UTC';
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
      const parsedStartTime = parseDate(startTime);

      // Check if `parsedStartTime` is valid
      if (parsedStartTime) {
        console.log(`Parsed start time (local): ${parsedStartTime}`);

        // Log the milliseconds since epoch for debugging
        console.log(`Parsed start time (epoch): ${parsedStartTime.getTime()}`);

        // Adjust the parsed date to the specified time zone using moment-timezone
        const adjustedStartTime = moment.tz(parsedStartTime, timeZone).toDate();
        console.log(`Adjusted start time with time zone (${timeZone}): ${adjustedStartTime}`);

        // Check if the final date is a valid date
        if (isNaN(adjustedStartTime.getTime())) {
          console.error('Invalid date detected after time zone adjustment');
          return;
        }

        // Store the adjusted start time in the group
        group.startTime = adjustedStartTime;
        epochTimestamp = adjustedStartTime.getTime();

      } else {
        console.log('Failed to parse start time using chrono-node');
      }

      group.notes = notes;

      await group.save();

      return {
        groupMessage,
        startTime: epochTimestamp,
        timeZone, // Return the IANA timezone format
        notes,
      } as IProssesedModalData;
    } else {
      console.log(`Group with ID ${groupId} not found`);
    }
  } else {
    console.log('Group ID not found in customId');
  }
};
