import dotenv from 'dotenv';
import { connectDB, getDB, isDBConnected, closeDB } from './db.js';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

dotenv.config();

const config = loadConfig();
const { port } = config;
let server;
let isShuttingDown = false;

async function startServer() {
  await connectDB({ uri: config.mongoUri, dbName: config.mongoDb });

  const app = createApp({ getDB, isDBConnected, config });
  server = app.listen(port, '127.0.0.1', () => {
    console.log(`Tech Katta API listening on port ${port}`);
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

  if (!server) {
    try {
      await closeDB();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
    return;
  }

  server.close(async () => {
    try {
      await closeDB();
      console.log('✅ HTTP server and MongoDB connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('❌ Graceful shutdown timed out.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  void shutdown('uncaughtException');
});

startServer().catch((error) => {
  console.error('❌ Failed to start Tech Katta API:', error);
  process.exit(1);
});
