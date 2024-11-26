import mongoose, { Mongoose } from 'mongoose';
import dotenv from 'dotenv';
import { LogLevel } from '../enums';
import { logger } from '../utils';

// Load environment variables from .env file
dotenv.config();

let conn: Mongoose | null = null;

export const mongooseConnectionHelper = async () => {
	const mongoUri = process.env.PROD_MONGO_URI;

	if (!mongoUri) {
		logger(LogLevel.ERROR, 'PROD_MONGO_URI is not defined in the .env file');
		process.exit(1);
	}

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
		logger(LogLevel.ERROR, `Error connecting to MongoDB: ${error}');`);
	}
};