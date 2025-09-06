import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Service to provide comprehensive logging for API calls and service operations
 */
export class ApiLoggingService {
  /**
   * Log API request start
   */
  static logApiRequestStart(service: string, operation: string, details?: any): void {
    logger(LogLevel.INFO, `🔍 [${service}] Starting ${operation}`);
    if (details) {
      logger(LogLevel.DEBUG, `🔍 [${service}] Request details: ${JSON.stringify(details)}`);
    }
  }

  /**
   * Log API request success
   */
  static logApiRequestSuccess(service: string, operation: string, duration: number, details?: any): void {
    logger(LogLevel.INFO, `✅ [${service}] ${operation} completed successfully in ${duration}ms`);
    if (details) {
      logger(LogLevel.DEBUG, `✅ [${service}] Response details: ${JSON.stringify(details)}`);
    }
  }

  /**
   * Log API request error
   */
  static logApiRequestError(service: string, operation: string, error: Error, details?: any): void {
    logger(LogLevel.ERROR, `❌ [${service}] ${operation} failed: ${error.message}`);
    if (details) {
      logger(LogLevel.DEBUG, `❌ [${service}] Error details: ${JSON.stringify(details)}`);
    }
  }

  /**
   * Log service operation start
   */
  static logServiceStart(service: string, operation: string, userId?: string): void {
    const userInfo = userId ? ` for user ${userId}` : '';
    logger(LogLevel.INFO, `🚀 [${service}] Starting ${operation}${userInfo}`);
  }

  /**
   * Log service operation success
   */
  static logServiceSuccess(service: string, operation: string, result?: any, userId?: string): void {
    const userInfo = userId ? ` for user ${userId}` : '';
    logger(LogLevel.INFO, `✅ [${service}] ${operation} completed successfully${userInfo}`);
    if (result) {
      logger(LogLevel.DEBUG, `✅ [${service}] Result: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Log service operation error
   */
  static logServiceError(service: string, operation: string, error: Error, userId?: string): void {
    const userInfo = userId ? ` for user ${userId}` : '';
    logger(LogLevel.ERROR, `❌ [${service}] ${operation} failed${userInfo}: ${error.message}`);
  }

  /**
   * Log database operation
   */
  static logDatabaseOperation(operation: string, collection: string, details?: any): void {
    logger(LogLevel.DEBUG, `💾 [Database] ${operation} on ${collection}`);
    if (details) {
      logger(LogLevel.DEBUG, `💾 [Database] Details: ${JSON.stringify(details)}`);
    }
  }

  /**
   * Log command execution
   */
  static logCommandExecution(command: string, userId: string, guildId?: string): void {
    const guildInfo = guildId ? ` in guild ${guildId}` : '';
    logger(LogLevel.INFO, `🎮 [Command] User ${userId} executed /${command}${guildInfo}`);
  }

  /**
   * Log button interaction
   */
  static logButtonInteraction(buttonId: string, userId: string, groupId?: string): void {
    const groupInfo = groupId ? ` for group ${groupId}` : '';
    logger(LogLevel.INFO, `🔘 [Button] User ${userId} clicked ${buttonId}${groupInfo}`);
  }

  /**
   * Log filter application
   */
  static logFilterApplication(filters: any, resultCount: number): void {
    logger(LogLevel.INFO, `🔍 [Filter] Applied filters: ${JSON.stringify(filters)}, found ${resultCount} results`);
  }

  /**
   * Log rate limiting
   */
  static logRateLimit(service: string, retryAfter?: number): void {
    const retryInfo = retryAfter ? `, retry after ${retryAfter}s` : '';
    logger(LogLevel.WARN, `⏰ [${service}] Rate limited${retryInfo}`);
  }

  /**
   * Log cache operations
   */
  static logCacheOperation(operation: 'hit' | 'miss' | 'set', key: string, ttl?: number): void {
    const ttlInfo = ttl ? ` (TTL: ${ttl}s)` : '';
    logger(LogLevel.DEBUG, `💾 [Cache] ${operation.toUpperCase()} for key: ${key}${ttlInfo}`);
  }
}
