import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env.js';

// Configure reliable DNS servers for MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS assignment is restricted
}

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`Connected to MongoDB at ${config.mongoUri.replace(/:[^:]*@/, ':***@')}`);
  } catch (err) {
    if (config.nodeEnv === 'production') {
      console.error('Fatal: Failed to connect to MongoDB in production environment:', err);
      process.exit(1);
    }

    console.warn(`MongoDB Atlas connection failed (${err.message}). Falling back to mongodb-memory-server...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
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
