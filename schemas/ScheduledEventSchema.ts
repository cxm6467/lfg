import { Schema, Model } from 'mongoose';
import { IScheduledEvent, IEventAttendance, IRecurrenceRule, IReminder } from '../interfaces/IScheduledEvent';
import { DungeonSchema, MemberSchema } from './GroupSchema';

const RecurrenceRuleSchema = new Schema<IRecurrenceRule>({
	frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'], required: true },
	interval: { type: Number, default: 1, min: 1 },
	daysOfWeek: [{ type: Number, min: 0, max: 6 }],
	dayOfMonth: { type: Number, min: 1, max: 31 },
	endDate: { type: Date },
	count: { type: Number, min: 1 },
}, { _id: false });

const ReminderSchema = new Schema<IReminder>({
	type: { type: String, enum: ['PUSH', 'DM', 'CHANNEL'], required: true },
	minutesBefore: { type: Number, required: true, min: 1 },
	message: { type: String, maxlength: 500 },
	sent: { type: Boolean, default: false },
	sentAt: { type: Date },
}, { _id: false });

export const ScheduledEventSchema = new Schema<IScheduledEvent, Model<IScheduledEvent>>({
	eventId: { type: String, required: true, unique: true, index: true },
	createdBy: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	channelId: { type: String, required: true },
	title: { type: String, required: true, maxlength: 100 },
	description: { type: String, maxlength: 1000 },
	dungeon: DungeonSchema,
	maxParticipants: { type: Number, default: 5, min: 1, max: 40 },
	currentParticipants: { type: [MemberSchema], default: [] },
	scheduledTime: { type: Date, required: true, index: true },
	timezone: { type: String, required: true, default: 'UTC' },
	isRecurring: { type: Boolean, default: false, index: true },
	recurrenceRule: RecurrenceRuleSchema,
	reminders: { type: [ReminderSchema], default: [] },
	tags: [{ type: String, maxlength: 50 }],
	isActive: { type: Boolean, default: true, index: true },
	nextOccurrence: { type: Date, index: true },
	parentEventId: { type: String, index: true },
}, { collection: 'scheduled_events', timestamps: true });

export const EventAttendanceSchema = new Schema<IEventAttendance, Model<IEventAttendance>>({
	eventId: { type: String, required: true, index: true },
	userId: { type: String, required: true, index: true },
	guildId: { type: String, required: true, index: true },
	status: { type: String, enum: ['CONFIRMED', 'TENTATIVE', 'DECLINED', 'NO_RESPONSE'], default: 'NO_RESPONSE' },
	respondedAt: { type: Date, default: Date.now },
	actualAttendance: { type: String, enum: ['ATTENDED', 'NO_SHOW', 'LEFT_EARLY'] },
	notes: { type: String, maxlength: 500 },
}, { collection: 'event_attendance', timestamps: true });

ScheduledEventSchema.index({ guildId: 1, scheduledTime: 1 });
ScheduledEventSchema.index({ isActive: 1, nextOccurrence: 1 });
EventAttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });