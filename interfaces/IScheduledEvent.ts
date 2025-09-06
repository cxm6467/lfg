import { Document } from 'mongoose';
import { IDungeon, IMember } from './';

export interface IRecurrenceRule {
	frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
	interval?: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	endDate?: Date;
	count?: number;
}

export interface IReminder {
	type: 'PUSH' | 'DM' | 'CHANNEL';
	minutesBefore: number;
	message?: string;
	sent?: boolean;
	sentAt?: Date;
}

export interface IScheduledEvent extends Document {
	eventId: string;
	createdBy: string;
	guildId: string;
	channelId: string;
	title: string;
	description?: string;
	dungeon?: IDungeon;
	maxParticipants: number;
	currentParticipants: IMember[];
	scheduledTime: Date;
	timezone: string;
	isRecurring: boolean;
	recurrenceRule?: IRecurrenceRule;
	reminders: IReminder[];
	tags: string[];
	isActive: boolean;
	nextOccurrence?: Date;
	parentEventId?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface IEventAttendance extends Document {
	eventId: string;
	userId: string;
	guildId: string;
	status: 'CONFIRMED' | 'TENTATIVE' | 'DECLINED' | 'NO_RESPONSE';
	respondedAt: Date;
	actualAttendance?: 'ATTENDED' | 'NO_SHOW' | 'LEFT_EARLY';
	notes?: string;
}