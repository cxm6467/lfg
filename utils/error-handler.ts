import { Interaction, InteractionResponse, BaseInteraction } from 'discord.js';
import { DiscordBotError, isDiscordBotError, wrapError } from '../errors';
import { logger } from './logger';
import { LogLevel } from '../enums';
import { config } from '../services/config';

/**
 * Centralized error handler for Discord interactions
 */
export async function handleInteractionError(
	interaction: BaseInteraction,
	error: unknown,
	context?: Record<string, unknown>
): Promise<void> {
	const botError = isDiscordBotError(error) ? error : wrapError(error, context);
	
	// Log the error with context
	logger(LogLevel.ERROR, `Interaction error: ${botError.code} - ${botError.message}`, {
		userId: interaction.user?.id,
		guildId: interaction.guildId,
		channelId: interaction.channelId,
		interactionId: interaction.id,
		error: config.sanitizeForLogging(botError.toJSON()),
	});

	// Respond to user if possible
	await respondToUserError(interaction, botError);
}

/**
 * Responds to the user with an appropriate error message
 */
async function respondToUserError(interaction: BaseInteraction, error: DiscordBotError): Promise<void> {
	if (!interaction.isRepliable()) {
		return;
	}

	const userMessage = getUserFriendlyMessage(error);

	try {
		if (interaction.replied || interaction.deferred) {
			await interaction.editReply({
				content: userMessage,
				components: [],
				embeds: [],
			});
		} else {
			await interaction.reply({
				content: userMessage,
				ephemeral: true,
			});
		}
	} catch (responseError) {
		logger(LogLevel.ERROR, `Failed to send error response: ${config.sanitizeForLogging(responseError)}`);
	}
}

/**
 * Converts technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error: DiscordBotError): string {
	switch (error.code) {
		case 'VALIDATION_ERROR':
			return `❌ Invalid input: ${error.message}`;
		
		case 'AUTHENTICATION_ERROR':
			return '❌ Authentication failed. Please try again.';
		
		case 'PERMISSION_ERROR':
			return '❌ You don\'t have permission to perform this action.';
		
		case 'NOT_FOUND_ERROR':
			return `❌ ${error.message}`;
		
		case 'CONFLICT_ERROR':
			return `❌ ${error.message}`;
		
		case 'RATE_LIMIT_ERROR':
			const retryAfter = (error as any).retryAfter;
			const retryMessage = retryAfter ? ` Please try again in ${retryAfter} seconds.` : '';
			return `⏱️ You're doing that too quickly.${retryMessage}`;
		
		case 'GROUP_ERROR':
			return `❌ Group error: ${error.message}`;
		
		case 'SCHEDULING_ERROR':
			return `📅 Scheduling error: ${error.message}`;
		
		case 'FEDERATION_ERROR':
			return `🏛️ Federation error: ${error.message}`;
		
		case 'VOICE_CHANNEL_ERROR':
			return `🎤 Voice channel error: ${error.message}`;
		
		case 'DATABASE_ERROR':
		case 'DISCORD_API_ERROR':
		case 'CONFIGURATION_ERROR':
		case 'ANALYTICS_ERROR':
		default:
			return '❌ Something went wrong. Please try again later.';
	}
}

/**
 * Async wrapper that catches and handles errors
 */
export function asyncErrorHandler<T extends BaseInteraction>(
	handler: (interaction: T) => Promise<void>
): (interaction: T) => Promise<void> {
	return async (interaction: T) => {
		try {
			await handler(interaction);
		} catch (error) {
			await handleInteractionError(interaction, error);
		}
	};
}

/**
 * Higher-order function for wrapping service methods with error handling
 */
export function withErrorHandling<TArgs extends readonly unknown[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>,
	context?: Record<string, unknown>
): (...args: TArgs) => Promise<TReturn> {
	return async (...args: TArgs): Promise<TReturn> => {
		try {
			return await fn(...args);
		} catch (error) {
			const botError = isDiscordBotError(error) ? error : wrapError(error, context);
			logger(LogLevel.ERROR, `Service error: ${botError.code} - ${botError.message}`, {
				context: config.sanitizeForLogging({ ...context, args }),
			});
			throw botError;
		}
	};
}

/**
 * Process-level error handlers
 */
export function setupGlobalErrorHandlers(): void {
	process.on('uncaughtException', (error: Error) => {
		logger(LogLevel.ERROR, `Uncaught Exception: ${error.message}`, {
			stack: error.stack,
			error: config.sanitizeForLogging(error),
		});
		
		// Give time for logs to flush before exit
		setTimeout(() => {
			process.exit(1);
		}, 1000);
	});

	process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
		logger(LogLevel.ERROR, `Unhandled Rejection: ${String(reason)}`, {
			reason: config.sanitizeForLogging(reason),
			promise: promise.toString(),
		});
	});
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(cleanup: () => Promise<void>): void {
	const gracefulShutdown = async (signal: string) => {
		logger(LogLevel.INFO, `${signal} received, shutting down gracefully`);
		
		try {
			await cleanup();
			logger(LogLevel.INFO, 'Cleanup completed successfully');
		} catch (error) {
			logger(LogLevel.ERROR, `Error during cleanup: ${config.sanitizeForLogging(error)}`);
		}
		
		process.exit(0);
	};

	process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}