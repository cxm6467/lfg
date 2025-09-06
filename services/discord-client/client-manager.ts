import { 
	Client, 
	GatewayIntentBits, 
	Partials, 
	Options,
	WebhookClient,
	ActivityType,
	PresenceUpdateStatus
} from 'discord.js';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';
import { setupGlobalErrorHandlers, setupGracefulShutdown } from '../../utils/error-handler';

/**
 * Enhanced Discord client manager with optimized configuration
 */
export class DiscordClientManager {
	private static instance: DiscordClientManager;
	private client: Client | null = null;
	private webhookClient: WebhookClient | null = null;
	private startTime: Date | null = null;

	private constructor() {}

	static getInstance(): DiscordClientManager {
		if (!DiscordClientManager.instance) {
			DiscordClientManager.instance = new DiscordClientManager();
		}
		return DiscordClientManager.instance;
	}

	/**
	 * Creates and configures the Discord client with optimal settings
	 */
	createClient(): Client {
		if (this.client) {
			return this.client;
		}

		// Optimized client configuration for Discord.js v14.22.1
		this.client = new Client({
			// Only request necessary intents for better performance and security
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates, // For voice channel management
				GatewayIntentBits.MessageContent, // For message processing if needed
			],
			
			// Enable partials for better message handling
			partials: [
				Partials.Message,
				Partials.Channel,
				Partials.User,
			],

			// Optimize presence and activities
			presence: {
				status: PresenceUpdateStatus.Online,
				activities: [{
					name: 'LFG Groups | /lfm',
					type: ActivityType.Watching,
				}],
			},

			// Enable compression and other optimizations
			ws: {
				compress: true,
				properties: {
					browser: 'Discord.js',
				},
			},

			// Cache settings for memory optimization
			makeCache: Options.cacheWithLimits({
				MessageManager: {
					maxSize: 100, // Keep only recent messages
					keepOverLimit: (message) => message.author.id === this.client?.user?.id,
				},
				GuildMemberManager: {
					maxSize: 200, // Limit cached members
					keepOverLimit: () => false,
				},
				UserManager: {
					maxSize: 500, // Reasonable user cache
					keepOverLimit: () => false,
				},
				// Unlimited cache for critical data
				GuildManager: Infinity,
				ChannelManager: Infinity,
				RoleManager: Infinity,
			}),

			// Sweep settings for memory management
			sweepers: {
				messages: {
					interval: 300, // 5 minutes
					filter: () => (message) => {
						// Keep bot messages and recent messages
						return message.author.id !== this.client?.user?.id && 
							   Date.now() - message.createdTimestamp > 300000; // 5 minutes old
					},
				},
				users: {
					interval: 3600, // 1 hour
					filter: () => () => true, // Remove all cached users not in guilds
				},
			},

			// REST configuration for API optimization
			rest: {
				timeout: 15000,
				retries: 3,
				rejectOnRateLimit: false,
			},

			// Disable mentions by default for security
			allowedMentions: {
				parse: ['users', 'roles'],
				repliedUser: false,
			},
		});

		this.setupClientEvents();
		return this.client;
	}

	/**
	 * Sets up optimized client event handlers
	 */
	private setupClientEvents(): void {
		if (!this.client) {
			throw new Error('Client not initialized');
		}

		// Client ready event
		this.client.once('ready', (readyClient) => {
			this.startTime = new Date();
			
			logger(LogLevel.INFO, `Discord bot ready! Logged in as ${readyClient.user.tag}`, {
				guilds: readyClient.guilds.cache.size,
				users: readyClient.users.cache.size,
				channels: readyClient.channels.cache.size,
			});

			// Set up periodic presence updates
			this.setupPresenceUpdates(readyClient);
		});

		// Connection status events
		this.client.on('reconnecting', () => {
			logger(LogLevel.WARN, 'Discord client reconnecting...');
		});

		this.client.on('resumed', () => {
			logger(LogLevel.INFO, 'Discord client resumed connection');
		});

		this.client.on('disconnect', (event) => {
			logger(LogLevel.WARN, 'Discord client disconnected', {
				code: event.code,
				reason: config.sanitizeForLogging(event.reason),
			});
		});

		// Rate limit handling
		this.client.rest.on('rateLimited', (rateLimitData) => {
			logger(LogLevel.WARN, 'Rate limited by Discord API', {
				route: rateLimitData.route,
				majorParameter: rateLimitData.majorParameter,
				method: rateLimitData.method,
				timeToReset: rateLimitData.timeToReset,
				limit: rateLimitData.limit,
			});
		});

		// Error handling
		this.client.on('error', (error) => {
			logger(LogLevel.ERROR, `Discord client error: ${config.sanitizeForLogging(error)}`);
		});

		this.client.on('warn', (warning) => {
			logger(LogLevel.WARN, `Discord client warning: ${warning}`);
		});

		// Debug events (only in development)
		if (config.isDevelopment) {
			this.client.on('debug', (debug) => {
				logger(LogLevel.DEBUG, `Discord client debug: ${debug}`);
			});
		}
	}

	/**
	 * Sets up periodic presence updates to show bot statistics
	 */
	private setupPresenceUpdates(client: Client): void {
		const updatePresence = (): void => {
			const guildCount = client.guilds.cache.size;
			const uptime = this.getUptime();
			
			const activities = [
				{ name: `LFG Groups | /lfm`, type: ActivityType.Watching },
				{ name: `${guildCount} servers`, type: ActivityType.Listening },
				{ name: `Uptime: ${uptime}`, type: ActivityType.Custom },
			];

			const randomActivity = activities[Math.floor(Math.random() * activities.length)];
			
			client.user?.setPresence({
				status: PresenceUpdateStatus.Online,
				activities: [randomActivity],
			});
		};

		// Update presence every 10 minutes
		setInterval(updatePresence, 10 * 60 * 1000);
		updatePresence(); // Initial update
	}

	/**
	 * Initializes and logs in the Discord client
	 */
	async initialize(): Promise<void> {
		if (!this.client) {
			this.createClient();
		}

		// Setup global error handlers
		setupGlobalErrorHandlers();
		
		// Setup graceful shutdown
		setupGracefulShutdown(async () => {
			await this.shutdown();
		});

		try {
			await this.client!.login(config.get('DISCORD_BOT_TOKEN'));
			logger(LogLevel.INFO, 'Discord client login successful');
		} catch (error) {
			logger(LogLevel.ERROR, `Failed to login Discord client: ${config.sanitizeForLogging(error)}`);
			throw error;
		}
	}

	/**
	 * Creates a webhook client for enhanced logging (optional)
	 */
	createWebhookClient(webhookUrl?: string): WebhookClient | null {
		if (!webhookUrl || this.webhookClient) {
			return this.webhookClient;
		}

		try {
			this.webhookClient = new WebhookClient({ url: webhookUrl });
			logger(LogLevel.INFO, 'Webhook client created for enhanced logging');
			return this.webhookClient;
		} catch (error) {
			logger(LogLevel.WARN, `Failed to create webhook client: ${config.sanitizeForLogging(error)}`);
			return null;
		}
	}

	/**
	 * Gets the current Discord client instance
	 */
	getClient(): Client | null {
		return this.client;
	}

	/**
	 * Gets client statistics
	 */
	getStats(): Record<string, unknown> {
		if (!this.client || !this.client.isReady()) {
			return { status: 'not_ready' };
		}

		return {
			status: 'ready',
			uptime: this.getUptime(),
			guilds: this.client.guilds.cache.size,
			users: this.client.users.cache.size,
			channels: this.client.channels.cache.size,
			ping: this.client.ws.ping,
			memoryUsage: process.memoryUsage(),
		};
	}

	/**
	 * Gets formatted uptime string
	 */
	private getUptime(): string {
		if (!this.startTime) {
			return 'Unknown';
		}

		const uptime = Date.now() - this.startTime.getTime();
		const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
		const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	/**
	 * Performs health check on the Discord client
	 */
	async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
		if (!this.client || !this.client.isReady()) {
			return { healthy: false, error: 'Client not ready' };
		}

		try {
			// Test API connectivity by fetching application info
			const startTime = Date.now();
			await this.client.application?.fetch();
			const latency = Date.now() - startTime;

			return {
				healthy: true,
				latency,
			};
		} catch (error) {
			return {
				healthy: false,
				error: String(error),
			};
		}
	}

	/**
	 * Gracefully shuts down the Discord client
	 */
	async shutdown(): Promise<void> {
		logger(LogLevel.INFO, 'Shutting down Discord client...');

		if (this.webhookClient) {
			this.webhookClient.destroy();
			this.webhookClient = null;
		}

		if (this.client) {
			this.client.destroy();
			this.client = null;
		}

		this.startTime = null;
		logger(LogLevel.INFO, 'Discord client shutdown complete');
	}
}

// Export singleton instance
export const discordClient = DiscordClientManager.getInstance();