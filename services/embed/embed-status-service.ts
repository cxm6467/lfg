import { Message } from 'discord.js';
import { LogLevel, ModalField } from '../../enums';
import { logger } from '../../utils';

/**
 * Service to handle embed status updates based on group timing
 */
export class EmbedStatusService {
  /**
   * Update embed start time field based on group status
   */
  static async updateStartTimeField(message: Message | undefined, startTime: Date | undefined): Promise<void> {
    if (!message || !startTime) return;

    try {
      const embed = message.embeds[0];
      if (!embed) return;

      const startTimeField = embed.fields.find(field => 
        field.name.replace(/\*/g, '').trim() === ModalField.StartTime.toString()
      );

      if (!startTimeField) return;

      const now = new Date();
      const startTimeUnix = Math.floor(startTime.getTime() / 1000);
      const nowUnix = Math.floor(now.getTime() / 1000);

      // If group has started (past start time), show static in-progress message
      if (nowUnix >= startTimeUnix) {
        startTimeField.value = `🟢 **IN PROGRESS**\nStarted: <t:${startTimeUnix}:F>`;
      } else {
        // Group hasn't started yet, show countdown
        startTimeField.value = `<t:${startTimeUnix}:F>\n<t:${startTimeUnix}:R>`;
      }

      await message.edit({ embeds: [embed] });
      logger(LogLevel.DEBUG, `Updated start time field for group status`);
    } catch (error) {
      logger(LogLevel.WARN, `Failed to update start time field: ${(error as Error).message}`);
    }
  }

  /**
   * Get formatted start time display based on group status
   */
  static getFormattedStartTime(startTime: Date | undefined): string {
    if (!startTime) return 'Not set';

    const now = new Date();
    const startTimeUnix = Math.floor(startTime.getTime() / 1000);
    const nowUnix = Math.floor(now.getTime() / 1000);

    // If group has started, show in-progress status
    if (nowUnix >= startTimeUnix) {
      return `🟢 **IN PROGRESS**`;
    } else {
      // Group hasn't started yet, show countdown
      return `<t:${startTimeUnix}:R>`;
    }
  }

  /**
   * Check if a group has started
   */
  static hasGroupStarted(startTime: Date | undefined): boolean {
    if (!startTime) return false;
    return new Date() >= startTime;
  }
}
