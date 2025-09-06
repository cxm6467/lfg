import {
	groupCreationSchema,
	eventCreationSchema,
	ratingSchema,
	validateSchema,
	safeValidateSchema,
	validateDiscordId,
} from '../../schemas/validation-schemas';
import { MemberRole, DungeonName, DungeonType } from '../../enums';

describe('Validation Schemas', () => {
	describe('groupCreationSchema', () => {
		const validGroupData = {
			groupName: 'Test Group',
			dungeonName: DungeonName.MISTS_OF_TIRNA_SCITHE,
			dungeonType: DungeonType.MYTHIC_PLUS,
			startTime: new Date(Date.now() + 3600000), // 1 hour from now
			notes: 'Test notes',
			maxMembers: 5,
			requiredRoles: [MemberRole.Tank, MemberRole.Healer, MemberRole.Dps],
			isPrivate: false,
		};

		it('should validate correct group data', () => {
			expect(() => validateSchema(groupCreationSchema, validGroupData)).not.toThrow();
		});

		it('should reject empty group name', () => {
			const invalidData = { ...validGroupData, groupName: '' };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should reject group name that is too long', () => {
			const invalidData = { ...validGroupData, groupName: 'a'.repeat(101) };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should reject invalid characters in group name', () => {
			const invalidData = { ...validGroupData, groupName: 'Test <script>' };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should reject past start time', () => {
			const invalidData = { ...validGroupData, startTime: new Date(Date.now() - 3600000) };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should reject notes that are too long', () => {
			const invalidData = { ...validGroupData, notes: 'a'.repeat(501) };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should reject invalid max members count', () => {
			const invalidData1 = { ...validGroupData, maxMembers: 1 };
			const invalidData2 = { ...validGroupData, maxMembers: 11 };
			
			expect(() => validateSchema(groupCreationSchema, invalidData1)).toThrow();
			expect(() => validateSchema(groupCreationSchema, invalidData2)).toThrow();
		});

		it('should reject empty required roles', () => {
			const invalidData = { ...validGroupData, requiredRoles: [] };
			expect(() => validateSchema(groupCreationSchema, invalidData)).toThrow();
		});

		it('should apply default values', () => {
			const minimalData = {
				groupName: 'Test',
				dungeonName: DungeonName.MISTS_OF_TIRNA_SCITHE,
				dungeonType: DungeonType.MYTHIC_PLUS,
				startTime: new Date(Date.now() + 3600000),
				requiredRoles: [MemberRole.Tank],
			};

			const result = validateSchema(groupCreationSchema, minimalData);
			expect(result.maxMembers).toBe(5);
			expect(result.isPrivate).toBe(false);
		});
	});

	describe('eventCreationSchema', () => {
		const validEventData = {
			title: 'Test Event',
			description: 'Test description',
			scheduledTime: new Date(Date.now() + 3600000),
			timezone: 'UTC',
			guildId: '123456789012345678',
			createdBy: '123456789012345678',
			maxAttendees: 10,
			isRecurring: false,
			reminders: [],
		};

		it('should validate correct event data', () => {
			expect(() => validateSchema(eventCreationSchema, validEventData)).not.toThrow();
		});

		it('should reject empty title', () => {
			const invalidData = { ...validEventData, title: '' };
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});

		it('should reject title that is too long', () => {
			const invalidData = { ...validEventData, title: 'a'.repeat(101) };
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});

		it('should reject invalid timezone', () => {
			const invalidData = { ...validEventData, timezone: 'Invalid/Timezone' };
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});

		it('should reject past scheduled time', () => {
			const invalidData = { ...validEventData, scheduledTime: new Date(Date.now() - 3600000) };
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});

		it('should require recurrence rule for recurring events', () => {
			const invalidData = { ...validEventData, isRecurring: true };
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});

		it('should limit number of reminders', () => {
			const invalidData = {
				...validEventData,
				reminders: Array(6).fill({ minutesBefore: 60 }),
			};
			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});
	});

	describe('ratingSchema', () => {
		const validRatingData = {
			raterId: '123456789012345678',
			ratedUserId: '123456789012345679',
			groupId: '123456789012345680',
			guildId: '123456789012345681',
			rating: 4,
			categories: {
				reliability: 4,
				leadership: 3,
				teamwork: 5,
				punctuality: 4,
			},
			comment: 'Great player!',
			isAnonymous: false,
		};

		it('should validate correct rating data', () => {
			expect(() => validateSchema(ratingSchema, validRatingData)).not.toThrow();
		});

		it('should reject invalid rating values', () => {
			const invalidData1 = { ...validRatingData, rating: 0 };
			const invalidData2 = { ...validRatingData, rating: 6 };
			
			expect(() => validateSchema(ratingSchema, invalidData1)).toThrow();
			expect(() => validateSchema(ratingSchema, invalidData2)).toThrow();
		});

		it('should reject invalid category ratings', () => {
			const invalidData = {
				...validRatingData,
				categories: { ...validRatingData.categories, reliability: 0 },
			};
			expect(() => validateSchema(ratingSchema, invalidData)).toThrow();
		});

		it('should reject comment that is too long', () => {
			const invalidData = { ...validRatingData, comment: 'a'.repeat(501) };
			expect(() => validateSchema(ratingSchema, invalidData)).toThrow();
		});
	});

	describe('validateDiscordId', () => {
		it('should validate correct Discord IDs', () => {
			expect(validateDiscordId('123456789012345678')).toBe(true);
			expect(validateDiscordId('1234567890123456789')).toBe(true);
		});

		it('should reject invalid Discord IDs', () => {
			expect(validateDiscordId('12345')).toBe(false); // Too short
			expect(validateDiscordId('12345678901234567890')).toBe(false); // Too long
			expect(validateDiscordId('12345678901234567a')).toBe(false); // Contains letter
			expect(validateDiscordId('')).toBe(false); // Empty
		});
	});

	describe('safeValidateSchema', () => {
		it('should return success for valid data', () => {
			const data = { groupName: 'Test', requiredRoles: [MemberRole.Tank] };
			const result = safeValidateSchema(
				groupCreationSchema.pick({ groupName: true, requiredRoles: true }),
				data
			);
			
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.groupName).toBe('Test');
			}
		});

		it('should return errors for invalid data', () => {
			const data = { groupName: '', requiredRoles: [] };
			const result = safeValidateSchema(
				groupCreationSchema.pick({ groupName: true, requiredRoles: true }),
				data
			);
			
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toHaveLength(2);
			}
		});
	});

	describe('complex validation scenarios', () => {
		it('should validate recurring event with proper recurrence rule', () => {
			const recurringEventData = {
				title: 'Weekly Raid',
				scheduledTime: new Date(Date.now() + 3600000),
				guildId: '123456789012345678',
				createdBy: '123456789012345678',
				isRecurring: true,
				recurrenceRule: {
					frequency: 'WEEKLY' as const,
					interval: 1,
					daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
					maxOccurrences: 10,
				},
			};

			expect(() => validateSchema(eventCreationSchema, recurringEventData)).not.toThrow();
		});

		it('should reject recurrence rule without end condition', () => {
			const invalidData = {
				title: 'Weekly Raid',
				scheduledTime: new Date(Date.now() + 3600000),
				guildId: '123456789012345678',
				createdBy: '123456789012345678',
				isRecurring: true,
				recurrenceRule: {
					frequency: 'WEEKLY' as const,
					interval: 1,
					daysOfWeek: [1, 3, 5],
					// Missing endDate or maxOccurrences
				},
			};

			expect(() => validateSchema(eventCreationSchema, invalidData)).toThrow();
		});
	});
});