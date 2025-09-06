import { z } from 'zod';
import { MemberRole, DungeonType, DungeonName } from '../enums';

/**
 * Base validation schemas for common types
 */

// Discord ID validation (snowflake)
export const discordIdSchema = z.string().regex(/^\d{17,19}$/, 'Invalid Discord ID format');

// Timezone validation
export const timezoneSchema = z.string().refine(
	(tz) => {
		try {
			Intl.DateTimeFormat(undefined, { timeZone: tz });
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'Invalid timezone' }
);

// Date validation (future dates only for events)
export const futureDateSchema = z.date().refine(
	(date) => date > new Date(),
	{ message: 'Date must be in the future' }
);

/**
 * Group-related validation schemas
 */

export const groupCreationSchema = z.object({
	groupName: z
		.string()
		.min(1, 'Group name is required')
		.max(100, 'Group name must be less than 100 characters')
		.regex(/^[a-zA-Z0-9\s\-_!?.,]+$/, 'Group name contains invalid characters'),
	
	dungeonName: z.nativeEnum(DungeonName, {
		errorMap: () => ({ message: 'Invalid dungeon selection' }),
	}),
	
	dungeonType: z.nativeEnum(DungeonType, {
		errorMap: () => ({ message: 'Invalid dungeon type' }),
	}),
	
	startTime: futureDateSchema,
	
	notes: z
		.string()
		.max(500, 'Notes must be less than 500 characters')
		.optional(),
	
	maxMembers: z
		.number()
		.int()
		.min(2, 'Group must have at least 2 members')
		.max(10, 'Group cannot have more than 10 members')
		.default(5),
	
	requiredRoles: z
		.array(z.nativeEnum(MemberRole))
		.min(1, 'At least one role is required')
		.max(5, 'Cannot require more than 5 roles'),
	
	isPrivate: z.boolean().default(false),
});

export const groupJoinSchema = z.object({
	groupId: discordIdSchema,
	userId: discordIdSchema,
	role: z.nativeEnum(MemberRole, {
		errorMap: () => ({ message: 'Invalid role selection' }),
	}),
});

export const groupUpdateSchema = groupCreationSchema.partial().extend({
	groupId: discordIdSchema,
});

/**
 * Event scheduling validation schemas
 */

export const recurrenceRuleSchema = z.object({
	frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY'], {
		errorMap: () => ({ message: 'Invalid recurrence frequency' }),
	}),
	
	interval: z
		.number()
		.int()
		.min(1, 'Interval must be at least 1')
		.max(12, 'Interval cannot exceed 12')
		.default(1),
	
	daysOfWeek: z
		.array(z.number().int().min(0).max(6))
		.max(7, 'Cannot specify more than 7 days')
		.optional(),
	
	endDate: z.date().optional(),
	
	maxOccurrences: z
		.number()
		.int()
		.min(1)
		.max(100, 'Cannot create more than 100 occurrences')
		.optional(),
}).refine(
	(data) => data.endDate || data.maxOccurrences,
	{ message: 'Either end date or max occurrences must be specified' }
);

export const eventCreationSchema = z.object({
	title: z
		.string()
		.min(1, 'Event title is required')
		.max(100, 'Event title must be less than 100 characters'),
	
	description: z
		.string()
		.max(1000, 'Event description must be less than 1000 characters')
		.optional(),
	
	scheduledTime: futureDateSchema,
	
	timezone: timezoneSchema.default('UTC'),
	
	guildId: discordIdSchema,
	
	createdBy: discordIdSchema,
	
	maxAttendees: z
		.number()
		.int()
		.min(1, 'Event must allow at least 1 attendee')
		.max(50, 'Event cannot have more than 50 attendees')
		.default(10),
	
	isRecurring: z.boolean().default(false),
	
	recurrenceRule: recurrenceRuleSchema.optional(),
	
	reminders: z
		.array(
			z.object({
				minutesBefore: z.number().int().min(1).max(10080), // Max 1 week
				message: z.string().max(200).optional(),
			})
		)
		.max(5, 'Cannot have more than 5 reminders')
		.default([]),
}).refine(
	(data) => !data.isRecurring || data.recurrenceRule,
	{ message: 'Recurring events must have a recurrence rule' }
);

/**
 * Player analytics validation schemas
 */

export const ratingSchema = z.object({
	raterId: discordIdSchema,
	ratedUserId: discordIdSchema,
	groupId: discordIdSchema,
	guildId: discordIdSchema,
	
	rating: z
		.number()
		.min(1, 'Rating must be at least 1')
		.max(5, 'Rating cannot exceed 5'),
	
	categories: z.object({
		reliability: z.number().min(1).max(5),
		leadership: z.number().min(1).max(5),
		teamwork: z.number().min(1).max(5),
		punctuality: z.number().min(1).max(5),
	}),
	
	comment: z
		.string()
		.max(500, 'Comment must be less than 500 characters')
		.optional(),
	
	isAnonymous: z.boolean().default(false),
});

/**
 * Federation validation schemas
 */

export const federationCreationSchema = z.object({
	name: z
		.string()
		.min(1, 'Federation name is required')
		.max(50, 'Federation name must be less than 50 characters')
		.regex(/^[a-zA-Z0-9\s\-_]+$/, 'Federation name contains invalid characters'),
	
	description: z
		.string()
		.max(300, 'Description must be less than 300 characters')
		.optional(),
	
	creatorGuildId: discordIdSchema,
	
	settings: z.object({
		allowCrossGuildGroups: z.boolean().default(true),
		sharePlayerStats: z.boolean().default(false),
		requireApproval: z.boolean().default(true),
		maxGuilds: z.number().int().min(2).max(50).default(10),
	}).default({}),
});

export const federationJoinRequestSchema = z.object({
	guildId: discordIdSchema,
	federationId: z.string().min(1, 'Federation ID is required'),
	message: z
		.string()
		.max(200, 'Message must be less than 200 characters')
		.optional(),
});

/**
 * Voice channel validation schemas
 */

export const voiceChannelCreationSchema = z.object({
	channelName: z
		.string()
		.min(1, 'Channel name is required')
		.max(50, 'Channel name must be less than 50 characters')
		.regex(/^[a-zA-Z0-9\s\-_]+$/, 'Channel name contains invalid characters'),
	
	guildId: discordIdSchema,
	
	groupId: z.string().optional(),
	
	maxUsers: z
		.number()
		.int()
		.min(1, 'Channel must allow at least 1 user')
		.max(99, 'Channel cannot have more than 99 users')
		.default(5),
	
	categoryId: discordIdSchema.optional(),
	
	autoDeleteMinutes: z
		.number()
		.int()
		.min(1, 'Auto-delete time must be at least 1 minute')
		.max(1440, 'Auto-delete time cannot exceed 24 hours')
		.default(60),
	
	isLocked: z.boolean().default(false),
});

/**
 * Utility validation functions
 */

export const validateDiscordId = (id: string): boolean => {
	return discordIdSchema.safeParse(id).success;
};

export const validateGroupName = (name: string): boolean => {
	return groupCreationSchema.shape.groupName.safeParse(name).success;
};

export const validateEmail = z
	.string()
	.email('Invalid email format')
	.optional();

export const validateUrl = z
	.string()
	.url('Invalid URL format')
	.optional();

/**
 * Schema validation helper with custom error handling
 */
export function validateSchema<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	context?: string
): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.errors.map(
				(err) => `${err.path.join('.')}: ${err.message}`
			).join(', ');
			
			throw new Error(
				`Validation failed${context ? ` for ${context}` : ''}: ${errorMessages}`
			);
		}
		throw error;
	}
}

/**
 * Safe schema validation that returns success/error result
 */
export function safeValidateSchema<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
	const result = schema.safeParse(data);
	
	if (result.success) {
		return { success: true, data: result.data };
	}
	
	const errors = result.error.errors.map(
		(err) => `${err.path.join('.')}: ${err.message}`
	);
	
	return { success: false, errors };
}

// Type exports for use in other files
export type GroupCreation = z.infer<typeof groupCreationSchema>;
export type GroupJoin = z.infer<typeof groupJoinSchema>;
export type GroupUpdate = z.infer<typeof groupUpdateSchema>;
export type EventCreation = z.infer<typeof eventCreationSchema>;
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type FederationCreation = z.infer<typeof federationCreationSchema>;
export type FederationJoinRequest = z.infer<typeof federationJoinRequestSchema>;
export type VoiceChannelCreation = z.infer<typeof voiceChannelCreationSchema>;