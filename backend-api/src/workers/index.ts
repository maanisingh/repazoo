/**
 * BullMQ Workers Entry Point
 *
 * This file imports and starts all BullMQ workers.
 * Run this separately from the API server: npm run start:workers
 */

import './auth.worker.js';
import './twitter-oauth.worker.js';
import './scan.worker.js';

console.log(`
🔄 Repazoo Workers Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workers running:
  • Auth Worker (registration, login)
  • Twitter OAuth Worker
  • Reputation Scan Worker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers gracefully...');
  process.exit(0);
});
