import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env.js';

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`Connected to MongoDB at ${config.mongoUri}`);
  } catch (err) {
    console.warn(`Local MongoDB connection failed. Falling back to mongodb-memory-server...`);
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`Connected to In-Memory MongoDB at ${uri}`);
    } catch (memErr) {
      console.error('Failed to connect to in-memory database:', memErr);
      process.exit(1);
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
