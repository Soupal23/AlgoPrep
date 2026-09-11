import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { Test } from './models/Test.js';
import { runSeed } from './seeds/seed.js';
import { initSocketServer } from './socket/socketManager.js';

const startServer = async () => {
  await connectDB();

  // Auto-seed if database contains 0 tests (e.g. fresh in-memory database)
  const testCount = await Test.countDocuments();
  if (testCount === 0) {
    console.log('No tests found on server startup. Auto-seeding 25 CS topic-wise tests (375 MCQs)...');
    await runSeed();
  }

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`🚀 AlgoPrep Server running on port ${config.port} [${config.nodeEnv}]`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
