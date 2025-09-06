/**
 * Custom error classes for Discord bot operations
 */

export abstract class DiscordBotError extends Error {
	public abstract readonly code: string;
	public abstract readonly statusCode: number;
	public readonly timestamp: Date;

	constructor(message: string, public readonly context?: Record<string, unknown>) {
		super(message);
		this.name = this.constructor.name;
		this.timestamp = new Date();
		Error.captureStackTrace(this, this.constructor);
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
			timestamp: this.timestamp,
			context: this.context,
		};
	}
}

export class ValidationError extends DiscordBotError {
	public readonly code = 'VALIDATION_ERROR';
	public readonly statusCode = 400;

	constructor(message: string, public readonly field?: string, context?: Record<string, unknown>) {
		super(message, { field, ...context });
	}
}

export class AuthenticationError extends DiscordBotError {
	public readonly code = 'AUTHENTICATION_ERROR';
	public readonly statusCode = 401;

	constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
		super(message, context);
	}
}

export class PermissionError extends DiscordBotError {
	public readonly code = 'PERMISSION_ERROR';
	public readonly statusCode = 403;

	constructor(message: string = 'Permission denied', context?: Record<string, unknown>) {
		super(message, context);
	}
}

export class NotFoundError extends DiscordBotError {
	public readonly code = 'NOT_FOUND_ERROR';
	public readonly statusCode = 404;

	constructor(resource: string, context?: Record<string, unknown>) {
		super(`${resource} not found`, context);
	}
}

export class ConflictError extends DiscordBotError {
	public readonly code = 'CONFLICT_ERROR';
	public readonly statusCode = 409;

	constructor(message: string, context?: Record<string, unknown>) {
		super(message, context);
	}
}

export class RateLimitError extends DiscordBotError {
	public readonly code = 'RATE_LIMIT_ERROR';
	public readonly statusCode = 429;

	constructor(
		message: string = 'Rate limit exceeded',
		public readonly retryAfter?: number,
		context?: Record<string, unknown>
	) {
		super(message, { retryAfter, ...context });
	}
}

export class DatabaseError extends DiscordBotError {
	public readonly code = 'DATABASE_ERROR';
	public readonly statusCode = 500;

	constructor(message: string, public readonly operation?: string, context?: Record<string, unknown>) {
		super(message, { operation, ...context });
	}
}

export class DiscordAPIError extends DiscordBotError {
	public readonly code = 'DISCORD_API_ERROR';
	public readonly statusCode = 500;

	constructor(
		message: string,
		public readonly discordCode?: number,
		context?: Record<string, unknown>
	) {
		super(message, { discordCode, ...context });
	}
}

export class ConfigurationError extends DiscordBotError {
	public readonly code = 'CONFIGURATION_ERROR';
	public readonly statusCode = 500;

	constructor(message: string, public readonly configKey?: string, context?: Record<string, unknown>) {
		super(message, { configKey, ...context });
	}
}

export class GroupError extends DiscordBotError {
	public readonly code = 'GROUP_ERROR';
	public readonly statusCode = 400;

	constructor(message: string, public readonly groupId?: string, context?: Record<string, unknown>) {
		super(message, { groupId, ...context });
	}
}

export class SchedulingError extends DiscordBotError {
	public readonly code = 'SCHEDULING_ERROR';
	public readonly statusCode = 400;

	constructor(message: string, public readonly eventId?: string, context?: Record<string, unknown>) {
		super(message, { eventId, ...context });
	}
}

export class AnalyticsError extends DiscordBotError {
	public readonly code = 'ANALYTICS_ERROR';
	public readonly statusCode = 500;

	constructor(message: string, context?: Record<string, unknown>) {
		super(message, context);
	}
}

export class FederationError extends DiscordBotError {
	public readonly code = 'FEDERATION_ERROR';
	public readonly statusCode = 400;

	constructor(message: string, public readonly federationId?: string, context?: Record<string, unknown>) {
		super(message, { federationId, ...context });
	}
}

export class VoiceChannelError extends DiscordBotError {
	public readonly code = 'VOICE_CHANNEL_ERROR';
	public readonly statusCode = 400;

	constructor(message: string, public readonly channelId?: string, context?: Record<string, unknown>) {
		super(message, { channelId, ...context });
	}
}

/**
 * Utility function to determine if an error is a known Discord bot error
 */
export function isDiscordBotError(error: unknown): error is DiscordBotError {
	return error instanceof DiscordBotError;
}

/**
 * Utility function to wrap unknown errors as DiscordBotError
 */
export function wrapError(error: unknown, context?: Record<string, unknown>): DiscordBotError {
	if (isDiscordBotError(error)) {
		return error;
	}

	if (error instanceof Error) {
		return new DatabaseError(error.message, undefined, { originalError: error.name, ...context });
	}

	return new DatabaseError('Unknown error occurred', undefined, { originalError: String(error), ...context });
}