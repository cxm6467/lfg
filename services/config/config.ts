import { z } from 'zod';
import dotenv from 'dotenv';
import { LogLevel } from '../../enums';

dotenv.config();

const environmentSchema = z.object({
	DISCORD_BOT_TOKEN: z.string().min(1, 'Discord bot token is required'),
	DISCORD_BOT_APP_ID: z.string().min(1, 'Discord bot application ID is required'),
	GUILD_ID: z.string().min(1, 'Guild ID is required'),
	PROD_MONGO_URI: z.string().url('MongoDB URI must be a valid URL'),
	LOGTAIL_SOURCE_TOKEN: z.string().optional(),
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'HIGHLIGHT']).default('INFO'),
	CLEANUP_INTERVAL_MS: z.string().optional().default('300000').transform((val) => parseInt(val, 10)),
	DB_TIMEOUT_MS: z.string().optional().default('3000').transform((val) => parseInt(val, 10)),
});

type Environment = z.infer<typeof environmentSchema>;

class ConfigService {
	private static instance: ConfigService;
	private config: Environment;
	private sensitiveKeys = [
		'DISCORD_BOT_TOKEN',
		'PROD_MONGO_URI',
		'LOGTAIL_SOURCE_TOKEN',
	];

	private constructor() {
		this.config = this.validateEnvironment();
	}

	static getInstance(): ConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService();
		}
		return ConfigService.instance;
	}

	private validateEnvironment(): Environment {
		try {
			const parsed = environmentSchema.parse(process.env);
			console.log(`[${new Date().toISOString()}] Configuration loaded successfully`);
			return parsed;
		}
		catch (error) {
			if (error instanceof z.ZodError) {
				console.error('❌ Environment validation failed:');
				error.issues.forEach((err: z.ZodIssue) => {
					console.error(`  - ${err.path.join('.')}: ${err.message}`);
				});
			}
			else {
				console.error('❌ Unexpected configuration error:', error);
			}
			process.exit(1);
		}
	}

	get discordBotToken(): string {
		return this.config.DISCORD_BOT_TOKEN;
	}

	get discordBotAppId(): string {
		return this.config.DISCORD_BOT_APP_ID;
	}

	get guildId(): string {
		return this.config.GUILD_ID;
	}

	get mongoUri(): string {
		return this.config.PROD_MONGO_URI;
	}

	get logtailToken(): string | undefined {
		return this.config.LOGTAIL_SOURCE_TOKEN;
	}

	get isProduction(): boolean {
		return this.config.NODE_ENV === 'production';
	}

	get isDevelopment(): boolean {
		return this.config.NODE_ENV === 'development';
	}

	get logLevel(): LogLevel {
		switch (this.config.LOG_LEVEL) {
			case 'DEBUG': return LogLevel.DEBUG;
			case 'INFO': return LogLevel.INFO;
			case 'WARN': return LogLevel.WARN;
			case 'ERROR': return LogLevel.ERROR;
			case 'HIGHLIGHT': return LogLevel.HIGHLIGHT;
			default: return LogLevel.INFO;
		}
	}

	get cleanupIntervalMs(): number {
		return this.config.CLEANUP_INTERVAL_MS;
	}

	get dbTimeoutMs(): number {
		return this.config.DB_TIMEOUT_MS;
	}

	sanitizeForLogging(data: unknown): string {
		if (typeof data === 'string') {
			return this.sanitizeString(data);
		}

		if (Array.isArray(data)) {
			return JSON.stringify(data.map(item => this.sanitizeForLogging(item)));
		}

		if (data && typeof data === 'object') {
			const sanitized: Record<string, string> = {};
			for (const [key, value] of Object.entries(data)) {
				if (this.isSensitiveKey(key)) {
					sanitized[key] = this.maskSensitiveValue(String(value));
				}
				else {
					sanitized[key] = this.sanitizeForLogging(value);
				}
			}
			return JSON.stringify(sanitized);
		}

		return String(data);
	}

	private sanitizeString(str: string): string {
		for (const sensitiveValue of Object.values(this.config)) {
			if (typeof sensitiveValue === 'string' && sensitiveValue.length > 8) {
				str = str.replace(new RegExp(sensitiveValue, 'gi'), this.maskSensitiveValue(sensitiveValue));
			}
		}
		return str;
	}

	private isSensitiveKey(key: string): boolean {
		return this.sensitiveKeys.some(sensitiveKey =>
			key.toLowerCase().includes(sensitiveKey.toLowerCase()) ||
			key.toLowerCase().includes('token') ||
			key.toLowerCase().includes('password') ||
			key.toLowerCase().includes('secret') ||
			key.toLowerCase().includes('key') ||
			key.toLowerCase().includes('uri'),
		);
	}

	private maskSensitiveValue(value: string): string {
		if (value.length <= 8) {
			return '***';
		}
		return value.slice(0, 4) + '***' + value.slice(-4);
	}

	get<K extends keyof Environment>(key: K): Environment[K] {
		return this.config[key];
	}

	getPublicConfig(): Partial<Environment> {
		return {
			NODE_ENV: this.config.NODE_ENV,
			LOG_LEVEL: this.config.LOG_LEVEL,
			CLEANUP_INTERVAL_MS: this.config.CLEANUP_INTERVAL_MS,
			DB_TIMEOUT_MS: this.config.DB_TIMEOUT_MS,
		};
	}
}

export const config = ConfigService.getInstance();