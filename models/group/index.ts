import mongoose from 'mongoose';
import { IGroup } from '../../interfaces/IGroup';
import { GroupSchema } from '../../schemas/GroupSchema';

export const GroupModel = mongoose.model<IGroup>('Group', GroupSchema, 'group');