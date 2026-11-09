import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { Test } from './models/Test.js';
import { runSeed } from './seeds/seed.js';
import { startWorkers } from './queue/startWorkers.js';

const startServer = async () => {
  await connectDB();

  // Auto-seed if database contains 0 tests (e.g. fresh in-memory database)
  const testCount = await Test.countDocuments();
  if (testCount === 0) {
    console.log('No tests found on server startup. Auto-seeding CS topic-wise tests...');
    await runSeed();
  }

  // Start BullMQ background workers if enabled
  if (config.runWorkers) {
    try {
      startWorkers();
    } catch (workerErr) {
      console.warn('Could not initialize background workers (Redis may be offline):', workerErr.message);
    }
  }

  const httpServer = http.createServer(app);

  httpServer.listen(config.port, () => {
    console.log(`🚀 AlgoPrep Server running on port ${config.port} [${config.nodeEnv}]`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
