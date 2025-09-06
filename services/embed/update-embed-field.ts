import { Message } from 'discord.js';
import { LogLevel, MemberRole, ModalField, PartyBuffs } from '../../enums';
import { logger } from '../../utils';
import { userProfileService } from '../user/user-profile-service';
import { EmbedStatusService } from './embed-status-service';

/**
 * Updates a specific field in an embed message.
 *
 * @param {Message | undefined} message - The message containing the embed to update.
 * @param {MemberRole | PartyBuffs | ModalField} field - The field to update in the embed.
 * @param {string} userId - The ID of the user to mention or associate with the field.
 * @param {string | number} [value] - The value to set for the field, if applicable.
 *
 * @returns {Promise<void>} A promise that resolves when the embed has been updated.
 *
 * @example
 * // Update the Tank role field with a user mention
 * await updateEmbedField(message, MemberRole.Tank, '1234567890');
 *
 * @example
 * // Update the start time field with a timestamp
 * await updateEmbedField(message, ModalField.StartTime, '1234567890', Date.now());
 */
export const updateEmbedField = async (message: Message|undefined, field: MemberRole | PartyBuffs | ModalField, userId: string, value?: string|number) => {
	const embed = message?.embeds[0];

	logger(LogLevel.DEBUG, `Embed fields: ${JSON.stringify(embed?.fields)}`);
	const roleField = embed?.fields.find(x => x.name.replace(/\*/g, '').trim() === field.toString().replace(/ /g, ''));
	logger(LogLevel.DEBUG, `Role field: ${JSON.stringify(roleField)}`);

	if (roleField) {
		switch (field) {
		case MemberRole.Tank:
			roleField.value = await getFormattedUserDisplay(userId);
			break;
		case MemberRole.Healer:
			roleField.value = await getFormattedUserDisplay(userId);
			break;
		case MemberRole.Dps:
			if (roleField.value === 'None') {
				roleField.value = await getFormattedUserDisplay(userId);
			}
			else if (!roleField.value.includes(`<@${userId}>`)) {
				roleField.value += `\n${await getFormattedUserDisplay(userId)}`;
			}
			break;
		case PartyBuffs.Bres:
			roleField.value = '✅';
			break;
		case PartyBuffs.Lust:
			roleField.value = '✅';
			break;
		case ModalField.StartTime:
			logger(LogLevel.INFO, `Setting start time: ${value as number}`);
			
			// Use the status service to determine the display format
			const startTimeDate = new Date((value as number) * 1000);
			roleField.value = EmbedStatusService.hasGroupStarted(startTimeDate) 
				? `🟢 **IN PROGRESS**\nStarted: <t:${value as number}:F>`
				: `<t:${value as number}:F>\n<t:${value as number}:R>`;
			break;
		case ModalField.Notes:
			roleField.value = value?.toString() ?? '';
			break;
		default:
			return;
		}
	}
	else {
		logger(LogLevel.WARN, `Role field not found for field: ${roleField}`);
	}

	await message?.edit({ embeds: [embed ?? {}] });
};

/**
 * Get formatted user display with Raider.IO data
 */
async function getFormattedUserDisplay(userId: string): Promise<string> {
	try {
		const user = await userProfileService.getUserProfile(userId);
		if (user) {
			return await userProfileService.getFormattedUserDisplay(user, `<@${userId}>`);
		}
	} catch (error) {
		logger(LogLevel.WARN, `Failed to get user profile for display: ${(error as Error).message}`);
	}
	
	// Fallback to basic mention
	return `<@${userId}>`;
}