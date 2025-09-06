import { LogLevel } from '../../enums';
import { logger } from '../../utils';
import { UserErrorNotificationService } from './user-error-notification-service';

/**
 * Service to handle errors gracefully with appropriate logging and user feedback
 */
export class ErrorHandlerService {
  /**
   * Handle non-critical errors with graceful degradation
   */
  static async handleNonCriticalError(
    operation: string,
    error: Error,
    fallbackAction?: () => Promise<void>
  ): Promise<void> {
    logger(LogLevel.WARN, `Non-critical error in ${operation}: ${error.message}`);
    
    if (fallbackAction) {
      try {
        await fallbackAction();
        logger(LogLevel.INFO, `Fallback action completed for ${operation}`);
      } catch (fallbackError) {
        logger(LogLevel.ERROR, `Fallback action failed for ${operation}: ${(fallbackError as Error).message}`);
      }
    }
  }

  /**
   * Handle API errors gracefully
   */
  static async handleApiError(
    apiName: string,
    error: any,
    fallbackData?: any
  ): Promise<any> {
    if (error.response?.status === 404) {
      logger(LogLevel.WARN, `${apiName} API: Resource not found`);
      return fallbackData || null;
    }
    
    if (error.response?.status === 429) {
      logger(LogLevel.WARN, `${apiName} API: Rate limited, using fallback data`);
      return fallbackData || null;
    }
    
    if (error.response?.status >= 500) {
      logger(LogLevel.ERROR, `${apiName} API: Server error (${error.response.status}), using fallback data`);
      return fallbackData || null;
    }
    
    logger(LogLevel.ERROR, `${apiName} API: Unexpected error - ${error.message}`);
    return fallbackData || null;
  }

  /**
   * Handle Discord API errors gracefully
   */
  static async handleDiscordError(
    operation: string,
    error: any,
    fallbackMessage?: string
  ): Promise<string> {
    if (error.code === 50001) {
      logger(LogLevel.WARN, `Discord API: Missing access for ${operation}`);
      return fallbackMessage || 'Missing permissions for this operation.';
    }
    
    if (error.code === 50013) {
      logger(LogLevel.WARN, `Discord API: Missing permissions for ${operation}`);
      return fallbackMessage || 'Insufficient permissions for this operation.';
    }
    
    if (error.code === 10008) {
      logger(LogLevel.WARN, `Discord API: Unknown message for ${operation}`);
      return fallbackMessage || 'Message not found.';
    }
    
    if (error.code === 10003) {
      logger(LogLevel.WARN, `Discord API: Unknown channel for ${operation}`);
      return fallbackMessage || 'Channel not found.';
    }
    
    if (error.code === 10004) {
      logger(LogLevel.WARN, `Discord API: Unknown guild for ${operation}`);
      return fallbackMessage || 'Server not found.';
    }
    
    logger(LogLevel.ERROR, `Discord API error in ${operation}: ${error.message} (Code: ${error.code})`);
    return fallbackMessage || 'An unexpected error occurred.';
  }

  /**
   * Handle database errors gracefully
   */
  static async handleDatabaseError(
    operation: string,
    error: any,
    fallbackData?: any
  ): Promise<any> {
    if (error.name === 'ValidationError') {
      logger(LogLevel.WARN, `Database validation error in ${operation}: ${error.message}`);
      return fallbackData || null;
    }
    
    if (error.name === 'CastError') {
      logger(LogLevel.WARN, `Database cast error in ${operation}: ${error.message}`);
      return fallbackData || null;
    }
    
    if (error.code === 11000) {
      logger(LogLevel.WARN, `Database duplicate key error in ${operation}`);
      return fallbackData || null;
    }
    
    logger(LogLevel.ERROR, `Database error in ${operation}: ${error.message}`);
    return fallbackData || null;
  }

  /**
   * Wrap async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.handleNonCriticalError(operationName, error as Error);
      return fallbackValue || null;
    }
  }

  /**
   * Handle user interaction errors gracefully
   */
  static async handleInteractionError(
    interaction: any,
    error: Error,
    userMessage?: string,
    client?: any
  ): Promise<void> {
    const message = userMessage || 'An error occurred while processing your request.';
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.reply({ content: message, flags: 64 }); // ephemeral
      }
    } catch (replyError) {
      logger(LogLevel.ERROR, `Failed to send error message to user: ${(replyError as Error).message}`);
    }

    // Send detailed error notification via DM if client is available
    if (client && interaction.user?.id) {
      const errorType = this.determineErrorType(error);
      await UserErrorNotificationService.notifyUserError(
        client,
        interaction.user.id,
        errorType,
        error.message,
        {
          command: interaction.commandName,
          suggestion: this.getErrorSuggestion(error)
        }
      );
    }
  }

  /**
   * Handle timestamp parsing errors with user notification
   */
  static async handleTimestampError(
    client: any,
    userId: string,
    invalidTime: string,
    command?: string
  ): Promise<void> {
    await UserErrorNotificationService.notifyTimestampError(
      client,
      userId,
      invalidTime,
      command
    );
  }

  /**
   * Determine error type for user notification
   */
  private static determineErrorType(error: Error): 'timestamp' | 'permission' | 'validation' | 'api' | 'general' {
    const message = error.message.toLowerCase();
    
    if (message.includes('time') || message.includes('date') || message.includes('timestamp')) {
      return 'timestamp';
    }
    
    if (message.includes('permission') || message.includes('access') || message.includes('unauthorized')) {
      return 'permission';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
      return 'validation';
    }
    
    if (message.includes('api') || message.includes('network') || message.includes('timeout')) {
      return 'api';
    }
    
    return 'general';
  }

  /**
   * Get helpful suggestion based on error
   */
  private static getErrorSuggestion(error: Error): string | undefined {
    const message = error.message.toLowerCase();
    
    if (message.includes('time') || message.includes('date')) {
      return 'Try using formats like "02/17/2025 15:30" or "tomorrow at 3pm"';
    }
    
    if (message.includes('permission')) {
      return 'Contact a server administrator for help with permissions';
    }
    
    if (message.includes('validation')) {
      return 'Check that all required fields are filled correctly';
    }
    
    if (message.includes('api') || message.includes('network')) {
      return 'Try again in a few minutes - this might be a temporary issue';
    }
    
    return undefined;
  }
}
