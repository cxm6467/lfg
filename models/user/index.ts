import mongoose from 'mongoose';
import { IUser } from '../../interfaces/IUser';
import { UserSchema } from '../../schemas/UserSchema';

export const UserModel = mongoose.model<IUser>('User', UserSchema, 'user');
