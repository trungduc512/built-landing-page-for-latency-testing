import process from 'node:process';

export const config = {
  port: Number(process.env.PORT || 8787),
  dbPath: process.env.DB_PATH || './data/results.db',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  adminToken: process.env.ADMIN_TOKEN || '',
  dbSynchronous: (process.env.DB_SYNCHRONOUS || 'FULL').toUpperCase(),
};

if (!config.adminToken) {
  // Admin endpoints will be disabled without a token; warn but don't crash.
  console.warn('[config] ADMIN_TOKEN not set — admin endpoints disabled.');
}
