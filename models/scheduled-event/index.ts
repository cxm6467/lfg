import { model } from 'mongoose';
import { IScheduledEvent, IEventAttendance } from '../../interfaces/IScheduledEvent';
import { ScheduledEventSchema, EventAttendanceSchema } from '../../schemas/ScheduledEventSchema';

export const ScheduledEventModel = model<IScheduledEvent>('ScheduledEvent', ScheduledEventSchema);
export const EventAttendanceModel = model<IEventAttendance>('EventAttendance', EventAttendanceSchema);