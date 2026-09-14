// Idempotency is enforced by the `tests.test_id` PRIMARY KEY (see repository.insertResult).
// This module documents the contract and provides a helper to check existence.

import { getDatabase } from '../db/database.js';

export function testExists(test_id) {
  const row = getDatabase()
    .prepare('SELECT 1 AS ok FROM tests WHERE test_id = ?')
    .get(test_id);
  return Boolean(row);
}
