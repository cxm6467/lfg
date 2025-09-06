import { RRule } from 'rrule';
import { DateTime } from 'luxon';
import * as cron from 'node-cron';
import { Client } from 'discord.js';
import { ScheduledEventModel, EventAttendanceModel } from '../../models/scheduled-event';
import { IScheduledEvent, IRecurrenceRule, IReminder } from '../../interfaces/IScheduledEvent';
import { logger } from '../../utils';
import { LogLevel } from '../../enums';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class SchedulingService {
	private static instance: SchedulingService;
	private client: Client;
	private cronJobs: Map<string, cron.ScheduledTask> = new Map();

	private constructor(client: Client) {
		this.client = client;
		this.initializeScheduler();
	}

	static getInstance(client: Client): SchedulingService {
		if (!SchedulingService.instance) {
			SchedulingService.instance = new SchedulingService(client);
		}
		return SchedulingService.instance;
	}

	private initializeScheduler(): void {
		cron.schedule('* * * * *', () => {
			this.processUpcomingEvents();
			this.processReminders();
		});

		cron.schedule('0 * * * *', () => {
			this.generateRecurringEvents();
		});

		logger(LogLevel.INFO, 'Scheduling service initialized');
	}

	async createScheduledEvent(eventData: Partial<IScheduledEvent>): Promise<IScheduledEvent> {
		const eventId = uuidv4();
		const event = new ScheduledEventModel({
			...eventData,
			eventId,
			nextOccurrence: eventData.scheduledTime,
		});

		if (eventData.isRecurring && eventData.recurrenceRule) {
			event.nextOccurrence = this.calculateNextOccurrence(
				eventData.scheduledTime!,
				eventData.recurrenceRule,
				eventData.timezone || 'UTC',
			);
		}

		await event.save();
		logger(LogLevel.INFO, `Created scheduled event: ${eventId}`);
		return event;
	}

	async getUpcomingEvents(guildId: string, hours: number = 24): Promise<IScheduledEvent[]> {
		const now = new Date();
		const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));

		return ScheduledEventModel.find({
			guildId,
			isActive: true,
			scheduledTime: { $gte: now, $lte: futureTime },
		}).sort({ scheduledTime: 1 });
	}

	async respondToEvent(eventId: string, userId: string, guildId: string, status: 'CONFIRMED' | 'TENTATIVE' | 'DECLINED'): Promise<void> {
		await EventAttendanceModel.findOneAndUpdate(
			{ eventId, userId },
			{
				eventId,
				userId,
				guildId,
				status,
				respondedAt: new Date(),
			},
			{ upsert: true },
		);

		logger(LogLevel.INFO, `User ${userId} responded to event ${eventId} with status: ${status}`);
	}

	private calculateNextOccurrence(startTime: Date, rule: IRecurrenceRule, timezone: string): Date | undefined {
		const startDateTime = DateTime.fromJSDate(startTime, { zone: timezone });

		let rrule: RRule;

		switch (rule.frequency) {
		case 'DAILY':
			rrule = new RRule({
				freq: RRule.DAILY,
				interval: rule.interval || 1,
				dtstart: startDateTime.toJSDate(),
				until: rule.endDate,
				count: rule.count,
			});
			break;
		case 'WEEKLY':
			rrule = new RRule({
				freq: RRule.WEEKLY,
				interval: rule.interval || 1,
				byweekday: rule.daysOfWeek,
				dtstart: startDateTime.toJSDate(),
				until: rule.endDate,
				count: rule.count,
			});
			break;
		case 'MONTHLY':
			rrule = new RRule({
				freq: RRule.MONTHLY,
				interval: rule.interval || 1,
				bymonthday: rule.dayOfMonth,
				dtstart: startDateTime.toJSDate(),
				until: rule.endDate,
				count: rule.count,
			});
			break;
		default:
			return undefined;
		}

		const nextOccurrence = rrule.after(new Date());
		return nextOccurrence || undefined;
	}

	private async processUpcomingEvents(): Promise<void> {
		try {
			const upcomingEvents = await ScheduledEventModel.find({
				isActive: true,
				scheduledTime: {
					$gte: new Date(),
					$lte: new Date(Date.now() + 5 * 60 * 1000),
				},
			});

			for (const event of upcomingEvents) {
				await this.triggerEvent(event);
			}
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error processing upcoming events: ${config.sanitizeForLogging(error)}`);
		}
	}

	private async processReminders(): Promise<void> {
		try {
			const eventsWithReminders = await ScheduledEventModel.find({
				isActive: true,
				'reminders.sent': false,
				scheduledTime: { $gte: new Date() },
			});

			for (const event of eventsWithReminders) {
				for (const reminder of event.reminders) {
					if (!reminder.sent) {
						const reminderTime = new Date(event.scheduledTime.getTime() - (reminder.minutesBefore * 60 * 1000));
						if (new Date() >= reminderTime) {
							await this.sendReminder(event, reminder);
							reminder.sent = true;
							reminder.sentAt = new Date();
						}
					}
				}
				await event.save();
			}
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error processing reminders: ${config.sanitizeForLogging(error)}`);
		}
	}

	private async generateRecurringEvents(): Promise<void> {
		try {
			const recurringEvents = await ScheduledEventModel.find({
				isRecurring: true,
				isActive: true,
				nextOccurrence: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
			});

			for (const event of recurringEvents) {
				if (event.recurrenceRule && event.nextOccurrence) {
					const newEventData = {
						...event.toObject(),
						eventId: uuidv4(),
						scheduledTime: event.nextOccurrence,
						parentEventId: event.eventId,
						currentParticipants: [],
						reminders: event.reminders.map(r => ({ ...r, sent: false, sentAt: undefined })),
						_id: undefined,
						createdAt: undefined,
						updatedAt: undefined,
					};

					await this.createScheduledEvent(newEventData);

					event.nextOccurrence = this.calculateNextOccurrence(
						event.nextOccurrence,
						event.recurrenceRule,
						event.timezone,
					);
					await event.save();
				}
			}
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error generating recurring events: ${config.sanitizeForLogging(error)}`);
		}
	}

	private async triggerEvent(event: IScheduledEvent): Promise<void> {
		try {
			const guild = this.client.guilds.cache.get(event.guildId);
			if (!guild) return;

			const channel = guild.channels.cache.get(event.channelId);
			if (!channel || !channel.isTextBased()) return;

			const attendees = await EventAttendanceModel.find({
				eventId: event.eventId,
				status: { $in: ['CONFIRMED', 'TENTATIVE'] },
			});

			const attendeeList = attendees.length > 0
				? attendees.map(a => `<@${a.userId}>`).join(', ')
				: 'No confirmed attendees yet';

			await channel.send({
				content: `🚀 **Event Starting Now!**\n**${event.title}**\n${event.description || ''}\n\n**Attendees:** ${attendeeList}`,
				allowedMentions: { users: attendees.map(a => a.userId) },
			});

			await ScheduledEventModel.updateOne(
				{ eventId: event.eventId },
				{ isActive: false },
			);

			logger(LogLevel.INFO, `Triggered event: ${event.eventId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error triggering event ${event.eventId}: ${config.sanitizeForLogging(error)}`);
		}
	}

	private async sendReminder(event: IScheduledEvent, reminder: IReminder): Promise<void> {
		try {
			const guild = this.client.guilds.cache.get(event.guildId);
			if (!guild) return;

			const timeUntilEvent = Math.floor((event.scheduledTime.getTime() - Date.now()) / 60000);
			const reminderMessage = reminder.message ||
				`⏰ Reminder: "${event.title}" starts in ${timeUntilEvent} minutes!`;

			switch (reminder.type) {
			case 'CHANNEL':
				const channel = guild.channels.cache.get(event.channelId);
				if (channel && channel.isTextBased()) {
					await channel.send(reminderMessage);
				}
				break;

			case 'DM':
				const attendees = await EventAttendanceModel.find({
					eventId: event.eventId,
					status: { $in: ['CONFIRMED', 'TENTATIVE'] },
				});

				for (const attendee of attendees) {
					try {
						const user = await this.client.users.fetch(attendee.userId);
						await user.send(reminderMessage);
					}
					catch {
						logger(LogLevel.WARN, `Could not send DM reminder to user ${attendee.userId}`);
					}
				}
				break;
			}

			logger(LogLevel.INFO, `Sent ${reminder.type} reminder for event: ${event.eventId}`);
		}
		catch (error) {
			logger(LogLevel.ERROR, `Error sending reminder for event ${event.eventId}: ${config.sanitizeForLogging(error)}`);
		}
	}
}