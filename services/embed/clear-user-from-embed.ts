import { Message } from 'discord.js';
import { LogLevel, MemberRole } from '../../enums';
import { logger } from '../../utils';

/**
 * Clears a user from all role fields in an embed message.
 *
 * @param {Message | undefined} message - The message containing the embed to update.
 * @param {string} userId - The ID of the user to remove from all fields.
 *
 * @returns {Promise<void>} A promise that resolves when the user has been cleared from all fields.
 */
export const clearUserFromEmbed = async (message: Message | undefined, userId: string) => {
	const embed = message?.embeds[0];
	if (!embed) {
		logger(LogLevel.WARN, 'No embed found in message');
		return;
	}

	const userMention = `<@${userId}>`;

	// Clear user from all role fields
	embed.fields.forEach(field => {
		const fieldName = field.name.replace(/\*/g, '').trim();

		// Check if this is a role field
		if ([MemberRole.Tank, MemberRole.Healer, MemberRole.Dps].includes(fieldName as MemberRole)) {
			if (field.value.includes(userMention)) {
				// Remove the user mention from the field
				const lines = field.value.split('\n').filter(line => line.trim() !== userMention);
				field.value = lines.length > 0 ? lines.join('\n') : 'None';

				logger(LogLevel.DEBUG, `Cleared user ${userId} from field ${fieldName}`);
			}
		}
	});

	await message?.edit({ embeds: [embed] });
};