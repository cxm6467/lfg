import mongoose, { Mongoose } from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

let conn: Mongoose | null = null;

export const mongooseConnectionHelper = async () => {
  const mongoUri = process.env.PROD_MONGO_URI;

  if (!mongoUri) {
    console.error('PROD_MONGO_URI is not defined in the .env file');
    process.exit(1);
  }

  try {
    conn = await mongoose.connect(
      mongoUri,
      {
        serverSelectionTimeoutMS: 3000,
      },
    );
    console.log('Successfully connected to MongoDB');
    return conn
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};