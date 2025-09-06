import { LogLevel } from '../../enums';
import chalk from 'chalk';
import { Logtail } from '@logtail/node';
import dotenv from 'dotenv';

dotenv.config();

interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  guildId?: string;
  groupId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  emoji?: string;
}

class StructuredLogger {
  private logtail: Logtail | null = null;
  private readonly serviceColors = new Map<string, string>([
    ['API', 'cyan'],
    ['DATABASE', 'green'],
    ['DISCORD', 'blue'],
    ['TTS', 'magenta'],
    ['VOICE', 'yellow'],
    ['USER', 'white'],
    ['SYSTEM', 'gray'],
  ]);

  constructor() {
    this.initializeLogtail();
  }

  private initializeLogtail(): void {
    try {
      if (process.env.LOGTAIL_SOURCE_TOKEN && process.env.ENABLE_LOGTAIL === 'true') {
        this.logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
        console.warn(chalk.blue('📊 Logger initialized with Logtail'));
      } else {
        console.warn(chalk.gray('📊 Logtail disabled or token not set'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize logger:'), error);
    }
  }

  /**
   * Log a structured message
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry(level, message, context);
    this.outputLog(logEntry);
    this.sendToLogtail(logEntry);
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext): StructuredLogEntry {
    const timestamp = new Date().toISOString();
    const levelName = this.getLevelName(level);
    const emoji = this.getEmojiForLevel(level);

    return {
      timestamp,
      level: levelName,
      message,
      context,
      emoji
    };
  }

  /**
   * Get level name from enum
   */
  private getLevelName(level: LogLevel): string {
    const levelNames = [
      'DEBUG', 'ERROR', 'HIGHLIGHT', 'INFO', 'WARN',
      'API_REQUEST', 'API_RESPONSE', 'API_ERROR', 'DATABASE',
      'DISCORD', 'TTS', 'VOICE', 'USER_ACTION', 'SYSTEM'
    ];
    return levelNames[level] || 'UNKNOWN';
  }

  /**
   * Get emoji for log level
   */
  private getEmojiForLevel(level: LogLevel): string {
    const emojiMap = new Map<LogLevel, string>([
      [LogLevel.DEBUG, '🔍'],
      [LogLevel.INFO, 'ℹ️'],
      [LogLevel.WARN, '⚠️'],
      [LogLevel.ERROR, '❌'],
      [LogLevel.HIGHLIGHT, '✨'],
      [LogLevel.API_REQUEST, '🌐'],
      [LogLevel.API_RESPONSE, '📡'],
      [LogLevel.API_ERROR, '🚫'],
      [LogLevel.DATABASE, '🗄️'],
      [LogLevel.DISCORD, '💬'],
      [LogLevel.TTS, '🎤'],
      [LogLevel.VOICE, '🔊'],
      [LogLevel.USER_ACTION, '👤'],
      [LogLevel.SYSTEM, '⚙️'],
    ]);

    return emojiMap.get(level) || '📝';
  }

  /**
   * Output log to console with colors and formatting
   */
  private outputLog(entry: StructuredLogEntry): void {
    const { timestamp, level, message, context, emoji } = entry;
    
    // Create timestamp prefix
    const timePrefix = chalk.gray(`[${timestamp}]`);
    
    // Create level prefix with color
    const levelPrefix = this.getColoredLevel(level);
    
    // Create service prefix if available
    const servicePrefix = context?.service ? this.getColoredService(context.service) : '';
    
    // Create context info
    const contextInfo = this.formatContext(context);
    
    // Combine all parts
    const fullMessage = [
      timePrefix,
      emoji,
      levelPrefix,
      servicePrefix,
      message,
      contextInfo
    ].filter(Boolean).join(' ');

    console.log(fullMessage);
  }

  /**
   * Get colored level string
   */
  private getColoredLevel(level: string): string {
    const colorMap = new Map<string, (text: string) => string>([
      ['DEBUG', chalk.magenta],
      ['INFO', chalk.gray],
      ['WARN', chalk.yellow],
      ['ERROR', chalk.red],
      ['HIGHLIGHT', chalk.bgYellow.black],
      ['API_REQUEST', chalk.cyan],
      ['API_RESPONSE', chalk.green],
      ['API_ERROR', chalk.red.bold],
      ['DATABASE', chalk.green],
      ['DISCORD', chalk.blue],
      ['TTS', chalk.magenta],
      ['VOICE', chalk.yellow],
      ['USER_ACTION', chalk.white],
      ['SYSTEM', chalk.gray],
    ]);

    const colorFn = colorMap.get(level) || chalk.white;
    return colorFn(`[${level}]`);
  }

  /**
   * Get colored service string
   */
  private getColoredService(service: string): string {
    const colorName = this.serviceColors.get(service.toUpperCase()) || 'white';
    const colorFn = (chalk as any)[colorName];
    return colorFn(`[${service}]`);
  }

  /**
   * Format context information
   */
  private formatContext(context?: LogContext): string {
    if (!context) return '';

    const parts: string[] = [];

    if (context.operation) {
      parts.push(chalk.blue(`op:${context.operation}`));
    }

    if (context.userId) {
      parts.push(chalk.cyan(`user:${context.userId}`));
    }

    if (context.guildId) {
      parts.push(chalk.blue(`guild:${context.guildId}`));
    }

    if (context.groupId) {
      parts.push(chalk.green(`group:${context.groupId}`));
    }

    if (context.duration !== undefined) {
      parts.push(chalk.yellow(`${context.duration}ms`));
    }

    if (context.statusCode) {
      const statusColor = context.statusCode >= 400 ? chalk.red : chalk.green;
      parts.push(statusColor(`${context.statusCode}`));
    }

    if (context.method && context.url) {
      parts.push(chalk.cyan(`${context.method} ${context.url}`));
    }

    if (context.error) {
      parts.push(chalk.red(`error:${context.error.message}`));
    }

    return parts.length > 0 ? chalk.gray(`(${parts.join(' ')})`) : '';
  }

  /**
   * Send log to Logtail
   */
  private sendToLogtail(entry: StructuredLogEntry): void {
    if (!this.logtail) return;

    try {
      const logtailEntry = {
        timestamp: entry.timestamp,
        level: entry.level.toLowerCase(),
        message: entry.message,
        emoji: entry.emoji,
        ...entry.context
      };

      switch (entry.level) {
        case 'DEBUG':
          this.logtail.debug(entry.message, logtailEntry);
          break;
        case 'INFO':
          this.logtail.info(entry.message, logtailEntry);
          break;
        case 'WARN':
          this.logtail.warn(entry.message, logtailEntry);
          break;
        case 'ERROR':
        case 'API_ERROR':
          this.logtail.error(entry.message, logtailEntry);
          break;
        default:
          this.logtail.log(entry.message);
          break;
      }

      this.logtail.flush();
    } catch (error) {
      console.error(chalk.red('❌ Failed to send log to Logtail:'), error);
    }
  }

  /**
   * Convenience methods for different log types
   */
  apiRequest(method: string, url: string, context?: Omit<LogContext, 'method' | 'url'>): void {
    this.log(LogLevel.API_REQUEST, `${method} ${url}`, {
      ...context,
      method,
      url
    });
  }

  apiResponse(method: string, url: string, statusCode: number, duration: number, context?: Omit<LogContext, 'method' | 'url' | 'statusCode' | 'duration'>): void {
    const level = statusCode >= 400 ? LogLevel.API_ERROR : LogLevel.API_RESPONSE;
    this.log(level, `${method} ${url} - ${statusCode}`, {
      ...context,
      method,
      url,
      statusCode,
      duration
    });
  }

  apiError(method: string, url: string, error: Error, context?: Omit<LogContext, 'method' | 'url' | 'error'>): void {
    this.log(LogLevel.API_ERROR, `${method} ${url} - ${error.message}`, {
      ...context,
      method,
      url,
      error
    });
  }

  database(operation: string, message: string, context?: Omit<LogContext, 'operation'>): void {
    this.log(LogLevel.DATABASE, message, {
      ...context,
      operation
    });
  }

  discord(action: string, message: string, context?: Omit<LogContext, 'operation'>): void {
    this.log(LogLevel.DISCORD, message, {
      ...context,
      operation: action
    });
  }

  tts(action: string, message: string, context?: Omit<LogContext, 'operation'>): void {
    this.log(LogLevel.TTS, message, {
      ...context,
      operation: action
    });
  }

  voice(action: string, message: string, context?: Omit<LogContext, 'operation'>): void {
    this.log(LogLevel.VOICE, message, {
      ...context,
      operation: action
    });
  }

  userAction(action: string, message: string, userId: string, context?: Omit<LogContext, 'operation' | 'userId'>): void {
    this.log(LogLevel.USER_ACTION, message, {
      ...context,
      operation: action,
      userId
    });
  }

  system(operation: string, message: string, context?: Omit<LogContext, 'operation'>): void {
    this.log(LogLevel.SYSTEM, message, {
      ...context,
      operation
    });
  }
}

// Export singleton instance
export const structuredLogger = new StructuredLogger();

// Export convenience function for backward compatibility
export const logger = (level: LogLevel, message: string, context?: LogContext): void => {
  structuredLogger.log(level, message, context);
};
