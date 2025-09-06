import { Client, User } from 'discord.js';
import { LogLevel } from '../../enums';
import { logger } from '../../utils';

/**
 * Service to handle user notifications for errors
 */
export class UserErrorNotificationService {
  private static readonly ERROR_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  private static readonly userCooldowns = new Map<string, number>();

  /**
   * Notify user about an error if appropriate
   */
  static async notifyUserError(
    client: Client,
    userId: string,
    errorType: 'timestamp' | 'permission' | 'validation' | 'api' | 'general',
    errorMessage: string,
    context?: {
      command?: string;
      groupId?: string;
      suggestion?: string;
    }
  ): Promise<void> {
    try {
      // Check cooldown to avoid spam
      const now = Date.now();
      const lastNotification = this.userCooldowns.get(userId);
      
      if (lastNotification && (now - lastNotification) < this.ERROR_COOLDOWN) {
        logger(LogLevel.DEBUG, `Skipping error notification for user ${userId} due to cooldown`);
        return;
      }

      const user = await client.users.fetch(userId);
      if (!user) {
        logger(LogLevel.WARN, `Could not fetch user ${userId} for error notification`);
        return;
      }

      const notificationMessage = this.buildErrorMessage(errorType, errorMessage, context);
      
      await user.send(notificationMessage);
      this.userCooldowns.set(userId, now);
      
      logger(LogLevel.INFO, `✅ Sent error notification to user ${userId} for ${errorType} error`);
      
    } catch (error) {
      logger(LogLevel.WARN, `⚠️ Failed to send error notification to user ${userId}: ${(error as Error).message}`);
    }
  }

  /**
   * Build appropriate error message based on error type
   */
  private static buildErrorMessage(
    errorType: string,
    errorMessage: string,
    context?: {
      command?: string;
      groupId?: string;
      suggestion?: string;
    }
  ): string {
    let message = `⚠️ **Bot Error Notification**\n\n`;
    
    switch (errorType) {
      case 'timestamp':
        message += `🕐 **Timestamp Error**\n`;
        message += `There was an issue with the time you provided. Please use one of these formats:\n\n`;
        message += `• **MM/DD/YYYY HH:MM** (24-hour): \`02/17/2025 15:30\`\n`;
        message += `• **MM/DD/YYYY HH:MM AM/PM** (12-hour): \`02/17/2025 03:30 PM\`\n`;
        message += `• **Natural language**: \`tomorrow at 3pm\`, \`next tuesday 8pm\`\n\n`;
        message += `**Error details:** ${errorMessage}\n\n`;
        message += `💡 **Tip:** Make sure to include your timezone (EST, PST, etc.) when setting up groups!`;
        break;
        
      case 'permission':
        message += `🔒 **Permission Error**\n`;
        message += `You don't have the required permissions for this action.\n\n`;
        message += `**Error details:** ${errorMessage}\n\n`;
        message += `💡 **Tip:** Contact a server administrator if you need help with permissions.`;
        break;
        
      case 'validation':
        message += `❌ **Validation Error**\n`;
        message += `The information you provided doesn't meet the requirements.\n\n`;
        message += `**Error details:** ${errorMessage}\n\n`;
        if (context?.suggestion) {
          message += `💡 **Suggestion:** ${context.suggestion}`;
        }
        break;
        
      case 'api':
        message += `🌐 **API Error**\n`;
        message += `There was a temporary issue connecting to external services (Raider.IO, Battle.net).\n\n`;
        message += `**Error details:** ${errorMessage}\n\n`;
        message += `💡 **Tip:** Please try again in a few minutes. If the problem persists, contact an administrator.`;
        break;
        
      default:
        message += `❌ **General Error**\n`;
        message += `An unexpected error occurred while processing your request.\n\n`;
        message += `**Error details:** ${errorMessage}\n\n`;
        message += `💡 **Tip:** Please try again, or contact an administrator if the problem continues.`;
    }

    if (context?.command) {
      message += `\n\n**Command:** \`/${context.command}\``;
    }

    if (context?.groupId) {
      message += `\n**Group ID:** \`${context.groupId}\``;
    }

    message += `\n\n_This is an automated message. Please don't reply to this DM._`;
    
    return message;
  }

  /**
   * Notify user about timestamp parsing errors specifically
   */
  static async notifyTimestampError(
    client: Client,
    userId: string,
    invalidTime: string,
    command?: string
  ): Promise<void> {
    const suggestion = this.getTimestampSuggestion(invalidTime);
    
    await this.notifyUserError(
      client,
      userId,
      'timestamp',
      `Could not parse time: "${invalidTime}"`,
      {
        command,
        suggestion
      }
    );
  }

  /**
   * Get helpful suggestions for timestamp errors
   */
  private static getTimestampSuggestion(invalidTime: string): string {
    const time = invalidTime.toLowerCase();
    
    if (time.includes('am') || time.includes('pm')) {
      return 'Make sure to include the date (MM/DD/YYYY) before the time.';
    }
    
    if (time.includes('/') && !time.includes(':')) {
      return 'Add the time after the date (MM/DD/YYYY HH:MM).';
    }
    
    if (time.includes(':') && !time.includes('/')) {
      return 'Add the date before the time (MM/DD/YYYY HH:MM).';
    }
    
    if (time.length < 8) {
      return 'Use a complete date and time format (MM/DD/YYYY HH:MM).';
    }
    
    return 'Try using a more specific format like "02/17/2025 15:30" or "tomorrow at 3pm".';
  }

  /**
   * Clear cooldown for a user (useful for testing)
   */
  static clearUserCooldown(userId: string): void {
    this.userCooldowns.delete(userId);
  }

  /**
   * Get cooldown status for a user
   */
  static getUserCooldownStatus(userId: string): {
    hasCooldown: boolean;
    remainingTime?: number;
  } {
    const lastNotification = this.userCooldowns.get(userId);
    
    if (!lastNotification) {
      return { hasCooldown: false };
    }
    
    const now = Date.now();
    const remainingTime = this.ERROR_COOLDOWN - (now - lastNotification);
    
    if (remainingTime <= 0) {
      this.userCooldowns.delete(userId);
      return { hasCooldown: false };
    }
    
    return {
      hasCooldown: true,
      remainingTime: Math.ceil(remainingTime / 1000) // Convert to seconds
    };
  }
}
