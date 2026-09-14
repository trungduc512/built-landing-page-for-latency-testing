import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

let db = null;

/** Open (or reuse) the SQLite database and apply the schema. */
export function openDatabase(dbPath = config.dbPath) {
  if (db) return db;
  const dir = dirname(dbPath);
  if (dir) mkdirSync(dir, { recursive: true });
  // enableWal lets node:sqlite set journal_mode=WAL on file databases.
  db = new DatabaseSync(dbPath, { enableWal: true });
  db.exec(`PRAGMA synchronous = ${config.dbSynchronous}`);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schemaSql);
  return db;
}

/** Get the currently open database (opens with the default path if needed). */
export function getDatabase() {
  if (!db) openDatabase();
  return db;
}

/**
 * Run `fn` inside a transaction. Mimics better-sqlite3's db.transaction().
 * Uses BEGIN/COMMIT/ROLLBACK so a thrown error rolls everything back.
 */
export function transaction(fn) {
  const database = getDatabase();
  database.exec('BEGIN');
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      database.exec('ROLLBACK');
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  }
}

/** Close the database (mainly for tests / graceful shutdown). */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

