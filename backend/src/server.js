import express from 'express';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { openDatabase, closeDatabase } from './db/database.js';
import resultsRouter from './routes/results.js';
import adminRouter from './routes/admin.js';

function corsMiddleware(req, res, next) {
  const origin = config.allowedOrigin;
  if (origin && origin !== '*') {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  } else {
    res.set('Access-Control-Allow-Origin', '*');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

/** Build the Express app (used by the server and by tests). */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(corsMiddleware);
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api', resultsRouter); // POST /api/results
  app.use('/api/admin', adminRouter); // GET /api/admin/...
  return app;
}

// Start listening only when run directly (not when imported by tests).
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  openDatabase();
  const server = createApp().listen(config.port, () => {
    console.log(`[server] listening on :${config.port} (db=${config.dbPath})`);
  });
  const shutdown = () => {
    console.log('[server] shutting down...');
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
