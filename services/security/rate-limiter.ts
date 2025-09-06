import { RateLimitError } from '../../errors';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Rate limiting configuration for different command types
 */
export interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	skipSuccessful?: boolean; // Don't count successful requests
	skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Default rate limiting configurations
 */
export const RATE_LIMIT_CONFIGS = {
	// General commands - 10 per minute
	DEFAULT: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10,
	},
	
	// Group creation - 3 per 5 minutes (more restrictive)
	GROUP_CREATION: {
		windowMs: 5 * 60 * 1000, // 5 minutes
		maxRequests: 3,
	},
	
	// Event scheduling - 5 per 10 minutes
	EVENT_SCHEDULING: {
		windowMs: 10 * 60 * 1000, // 10 minutes
		maxRequests: 5,
	},
	
	// Rating/feedback - 20 per hour
	RATING: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 20,
	},
	
	// Analytics queries - 30 per minute
	ANALYTICS: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30,
	},
	
	// Federation operations - 5 per 15 minutes
	FEDERATION: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5,
	},
} as const;

/**
 * In-memory store for rate limit tracking
 */
interface RateLimitEntry {
	count: number;
	resetTime: number;
}

export class RateLimitService {
	private static instance: RateLimitService;
	private limits = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;

	private constructor() {
		// Clean up expired entries every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 5 * 60 * 1000);
	}

	static getInstance(): RateLimitService {
		if (!RateLimitService.instance) {
			RateLimitService.instance = new RateLimitService();
		}
		return RateLimitService.instance;
	}

	/**
	 * Checks if a user is rate limited for a specific operation
	 */
	checkRateLimit(
		userId: string,
		operation: keyof typeof RATE_LIMIT_CONFIGS,
		customConfig?: RateLimitConfig
	): { allowed: boolean; retryAfter?: number; remaining?: number } {
		const config = customConfig || RATE_LIMIT_CONFIGS[operation];
		const key = `${userId}:${operation}`;
		const now = Date.now();
		
		let entry = this.limits.get(key);
		
		// Create new entry if doesn't exist or window has expired
		if (!entry || now > entry.resetTime) {
			entry = {
				count: 0,
				resetTime: now + config.windowMs,
			};
			this.limits.set(key, entry);
		}
		
		// Check if limit exceeded
		if (entry.count >= config.maxRequests) {
			const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
			
			logger(LogLevel.WARN, `Rate limit exceeded for user ${userId} on operation ${operation}`, {
				userId,
				operation,
				count: entry.count,
				limit: config.maxRequests,
				retryAfter,
			});
			
			return {
				allowed: false,
				retryAfter,
				remaining: 0,
			};
		}
		
		// Increment counter
		entry.count++;
		const remaining = config.maxRequests - entry.count;
		
		return {
			allowed: true,
			remaining,
		};
	}

	/**
	 * Enforces rate limiting and throws an error if exceeded
	 */
	enforceRateLimit(
		userId: string,
		operation: keyof typeof RATE_LIMIT_CONFIGS,
		customConfig?: RateLimitConfig
	): void {
		const result = this.checkRateLimit(userId, operation, customConfig);
		
		if (!result.allowed) {
			throw new RateLimitError(
				`Rate limit exceeded for ${operation}. Try again in ${result.retryAfter} seconds.`,
				result.retryAfter,
				{ userId, operation, remaining: result.remaining }
			);
		}
	}

	/**
	 * Resets rate limit for a specific user and operation
	 */
	resetRateLimit(userId: string, operation: keyof typeof RATE_LIMIT_CONFIGS): void {
		const key = `${userId}:${operation}`;
		this.limits.delete(key);
		
		logger(LogLevel.DEBUG, `Rate limit reset for user ${userId} on operation ${operation}`);
	}

	/**
	 * Gets current rate limit status for a user
	 */
	getRateLimitStatus(
		userId: string,
		operation: keyof typeof RATE_LIMIT_CONFIGS
	): { count: number; remaining: number; resetTime: number } | null {
		const config = RATE_LIMIT_CONFIGS[operation];
		const key = `${userId}:${operation}`;
		const entry = this.limits.get(key);
		
		if (!entry) {
			return null;
		}
		
		return {
			count: entry.count,
			remaining: Math.max(0, config.maxRequests - entry.count),
			resetTime: entry.resetTime,
		};
	}

	/**
	 * Cleans up expired rate limit entries
	 */
	private cleanup(): void {
		const now = Date.now();
		let cleanedCount = 0;
		
		for (const [key, entry] of this.limits.entries()) {
			if (now > entry.resetTime) {
				this.limits.delete(key);
				cleanedCount++;
			}
		}
		
		if (cleanedCount > 0) {
			logger(LogLevel.DEBUG, `Cleaned up ${cleanedCount} expired rate limit entries`);
		}
	}

	/**
	 * Gets statistics about current rate limiting
	 */
	getStats(): {
		totalEntries: number;
		activeUsers: number;
		operationBreakdown: Record<string, number>;
	} {
		const activeUsers = new Set<string>();
		const operationBreakdown: Record<string, number> = {};
		
		for (const key of this.limits.keys()) {
			const [userId, operation] = key.split(':');
			activeUsers.add(userId);
			operationBreakdown[operation] = (operationBreakdown[operation] || 0) + 1;
		}
		
		return {
			totalEntries: this.limits.size,
			activeUsers: activeUsers.size,
			operationBreakdown,
		};
	}

	/**
	 * Shuts down the rate limiter and cleans up resources
	 */
	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.limits.clear();
		logger(LogLevel.INFO, 'Rate limiter shutdown complete');
	}
}

/**
 * Decorator for rate limiting methods
 */
export function RateLimit(
	operation: keyof typeof RATE_LIMIT_CONFIGS,
	customConfig?: RateLimitConfig
) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value;
		
		descriptor.value = async function (this: any, ...args: any[]) {
			// Extract userId from first argument (assuming it's always present)
			const userId = args[0]?.userId || args[0]?.user?.id || args[0];
			
			if (typeof userId === 'string') {
				const rateLimiter = RateLimitService.getInstance();
				rateLimiter.enforceRateLimit(userId, operation, customConfig);
			}
			
			return await originalMethod.apply(this, args);
		};
		
		return descriptor;
	};
}

// Export singleton instance
export const rateLimiter = RateLimitService.getInstance();