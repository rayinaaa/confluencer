import { createApp } from './app.js';
import { config } from './config/index.js';
import { getDatabase, closeDatabase } from './db/database.js';

const app = createApp();

// Initialize database
const db = getDatabase();
console.log(`[Database] Initialized SQLite database at: ${config.dbPath}`);

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` 🚀 Transaction Ledger API is running!`);
  console.log(` 📡 Server URL:         http://localhost:${config.port}`);
  console.log(` 📚 Interactive Docs:   http://localhost:${config.port}/api-docs`);
  console.log(` 🖥️  Web Dashboard:      http://localhost:${config.port}/`);
  console.log(` 🛡️  Environment:        ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${config.port} is already in use.`);
  } else {
    console.error('[Server Error]', err);
  }
  process.exit(1);
});

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    closeDatabase();
    console.log('[Database] Database connection closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
