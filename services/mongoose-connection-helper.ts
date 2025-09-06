import mongoose, { Mongoose } from 'mongoose';
import { LogLevel } from '../enums';
import { logger } from '../utils';
import { config } from './config';

let conn: Mongoose | null = null;

export const mongooseConnectionHelper = async () => {
	const mongoUri = config.get('PROD_MONGO_URI');

	try {
		conn = await mongoose.connect(
			mongoUri,
			{
				serverSelectionTimeoutMS: 3000,
			},
		);
		logger(LogLevel.INFO, 'Successfully connected to MongoDB');
		return conn;
	}
	catch (error) {
		logger(LogLevel.ERROR, `Error connecting to MongoDB: ${config.sanitizeForLogging(error)}`);
		throw error;
	}
};