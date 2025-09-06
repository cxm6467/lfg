import { createHash } from 'crypto';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';

/**
 * Input sanitization and validation service
 */
export class InputSanitizer {
	private static instance: InputSanitizer;
	
	// Dangerous patterns to detect and block
	private readonly dangerousPatterns = [
		// SQL injection patterns
		/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
		/(UNION\s+SELECT|OR\s+1\s*=\s*1|AND\s+1\s*=\s*1)/gi,
		
		// XSS patterns
		/<script[^>]*>.*?<\/script>/gi,
		/<iframe[^>]*>.*?<\/iframe>/gi,
		/javascript:/gi,
		/on\w+\s*=/gi,
		
		// Command injection
		/(\||&&|;|\$\(|\`)/g,
		/(rm\s+-rf|wget|curl|nc\s+-|bash|sh\s+)/gi,
		
		// Path traversal
		/(\.\.\/|\.\.\\)/g,
		
		// Discord injection patterns
		/@(everyone|here)/gi,
		/<@[!&]?\d+>/g, // User/role mentions (will be controlled)
	];
	
	// Maximum lengths for different input types
	private readonly maxLengths = {
		groupName: 100,
		eventTitle: 100,
		description: 1000,
		notes: 500,
		comment: 500,
		federationName: 50,
		channelName: 50,
		message: 200,
		username: 32,
	} as const;

	private constructor() {}

	static getInstance(): InputSanitizer {
		if (!InputSanitizer.instance) {
			InputSanitizer.instance = new InputSanitizer();
		}
		return InputSanitizer.instance;
	}

	/**
	 * Sanitizes and validates text input
	 */
	sanitizeText(
		input: string,
		type: keyof typeof InputSanitizer.prototype.maxLengths = 'description',
		options: {
			allowMentions?: boolean;
			allowMarkdown?: boolean;
			allowEmojis?: boolean;
			stripNewlines?: boolean;
		} = {}
	): string {
		if (typeof input !== 'string') {
			throw new Error('Input must be a string');
		}

		let sanitized = input.trim();

		// Check length limits
		const maxLength = this.maxLengths[type];
		if (sanitized.length > maxLength) {
			throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
		}

		// Remove or escape dangerous patterns
		for (const pattern of this.dangerousPatterns) {
			if (pattern.test(sanitized)) {
				logger(LogLevel.WARN, 'Potentially dangerous input detected', {
					pattern: pattern.toString(),
					input: this.hashInput(input),
				});
				
				// Replace dangerous patterns with safe equivalents
				sanitized = sanitized.replace(pattern, '');
			}
		}

		// Handle Discord mentions
		if (!options.allowMentions) {
			sanitized = sanitized.replace(/<@[!&]?\d+>/g, '[mention]');
			sanitized = sanitized.replace(/@(everyone|here)/gi, '@\u200B$1'); // Zero-width space
		}

		// Handle markdown if not allowed
		if (!options.allowMarkdown) {
			const markdownChars = ['*', '_', '`', '~', '|', '>'];
			markdownChars.forEach(char => {
				const escapedChar = '\\' + char;
				sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), escapedChar);
			});
		}

		// Handle emojis if not allowed
		if (!options.allowEmojis) {
			// Remove custom Discord emojis
			sanitized = sanitized.replace(/<a?:\w+:\d+>/g, '');
			// Remove Unicode emojis (basic pattern)
			sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
		}

		// Strip newlines if requested
		if (options.stripNewlines) {
			sanitized = sanitized.replace(/\n/g, ' ').replace(/\s+/g, ' ');
		}

		// Normalize whitespace
		sanitized = sanitized.replace(/\s+/g, ' ').trim();

		return sanitized;
	}

	/**
	 * Validates Discord snowflake IDs
	 */
	validateDiscordId(id: string): boolean {
		if (typeof id !== 'string') {
			return false;
		}

		// Discord snowflakes are 17-19 digit numbers
		return /^\d{17,19}$/.test(id);
	}

	/**
	 * Sanitizes and validates URLs
	 */
	sanitizeUrl(url: string): string | null {
		if (typeof url !== 'string') {
			return null;
		}

		try {
			const parsed = new URL(url);
			
			// Only allow HTTP/HTTPS protocols
			if (!['http:', 'https:'].includes(parsed.protocol)) {
				logger(LogLevel.WARN, 'Invalid URL protocol detected', {
					protocol: parsed.protocol,
					url: this.hashInput(url),
				});
				return null;
			}

			// Block local/private IP ranges
			const hostname = parsed.hostname.toLowerCase();
			if (this.isPrivateIP(hostname)) {
				logger(LogLevel.WARN, 'Private IP address in URL blocked', {
					hostname,
					url: this.hashInput(url),
				});
				return null;
			}

			return parsed.toString();
		} catch (error) {
			logger(LogLevel.WARN, 'Invalid URL format', {
				url: this.hashInput(url),
				error: String(error),
			});
			return null;
		}
	}

	/**
	 * Validates and sanitizes JSON input
	 */
	sanitizeJson<T>(input: string, maxSize = 10000): T | null {
		if (typeof input !== 'string') {
			return null;
		}

		if (input.length > maxSize) {
			throw new Error(`JSON input exceeds maximum size of ${maxSize} characters`);
		}

		try {
			return JSON.parse(input);
		} catch (error) {
			logger(LogLevel.WARN, 'Invalid JSON input', {
				input: this.hashInput(input),
				error: String(error),
			});
			return null;
		}
	}

	/**
	 * Sanitizes database query parameters
	 */
	sanitizeDbQuery(params: Record<string, unknown>): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(params)) {
			// Validate key names (only alphanumeric and underscore)
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
				logger(LogLevel.WARN, 'Invalid database query key', { key });
				continue;
			}

			// Sanitize values based on type
			if (typeof value === 'string') {
				sanitized[key] = this.sanitizeText(value);
			} else if (typeof value === 'number' && isFinite(value)) {
				sanitized[key] = value;
			} else if (typeof value === 'boolean') {
				sanitized[key] = value;
			} else if (value instanceof Date) {
				sanitized[key] = value;
			} else if (value === null || value === undefined) {
				sanitized[key] = value;
			} else if (Array.isArray(value)) {
				// Recursively sanitize array elements
				sanitized[key] = value.map(item => 
					typeof item === 'string' ? this.sanitizeText(item) : item
				);
			} else {
				logger(LogLevel.WARN, 'Unsupported database query value type', {
					key,
					type: typeof value,
				});
			}
		}

		return sanitized;
	}

	/**
	 * Checks if an IP address is private/local
	 */
	private isPrivateIP(hostname: string): boolean {
		// IPv4 private ranges
		const ipv4Patterns = [
			/^10\./,
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./,
			/^192\.168\./,
			/^127\./,
			/^169\.254\./, // Link-local
		];

		// IPv6 private ranges
		const ipv6Patterns = [
			/^::1$/, // Loopback
			/^fe80::/i, // Link-local
			/^fc00::/i, // Unique local
			/^fd00::/i, // Unique local
		];

		// Check if it's localhost
		if (['localhost', '0.0.0.0'].includes(hostname)) {
			return true;
		}

		// Check IPv4 patterns
		for (const pattern of ipv4Patterns) {
			if (pattern.test(hostname)) {
				return true;
			}
		}

		// Check IPv6 patterns
		for (const pattern of ipv6Patterns) {
			if (pattern.test(hostname)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Creates a hash of sensitive input for logging purposes
	 */
	private hashInput(input: string): string {
		return createHash('sha256').update(input).digest('hex').substring(0, 16);
	}

	/**
	 * Validates file names for security
	 */
	validateFileName(filename: string): boolean {
		if (typeof filename !== 'string') {
			return false;
		}

		// Check for path traversal attempts
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return false;
		}

		// Check for null bytes
		if (filename.includes('\0')) {
			return false;
		}

		// Must have reasonable length
		if (filename.length === 0 || filename.length > 255) {
			return false;
		}

		// Must not start with dot (hidden files)
		if (filename.startsWith('.')) {
			return false;
		}

		return true;
	}

	/**
	 * Escapes special regex characters in user input
	 */
	escapeRegex(input: string): string {
		return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Rate limiting for sanitization operations (prevent abuse)
	 */
	private sanitizationCounts = new Map<string, { count: number; resetTime: number }>();

	checkSanitizationRateLimit(userId: string, maxPerMinute = 100): boolean {
		const now = Date.now();
		const key = `sanitize:${userId}`;
		
		let entry = this.sanitizationCounts.get(key);
		
		if (!entry || now > entry.resetTime) {
			entry = { count: 0, resetTime: now + 60000 }; // 1 minute window
			this.sanitizationCounts.set(key, entry);
		}
		
		if (entry.count >= maxPerMinute) {
			logger(LogLevel.WARN, 'Sanitization rate limit exceeded', { userId });
			return false;
		}
		
		entry.count++;
		return true;
	}
}

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance();