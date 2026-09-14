import { getDatabase, transaction } from './database.js';

const nowUtc = () => new Date().toISOString();

/**
 * Insert a full test result (test + regions + samples). Idempotent by test_id:
 * if a test with this test_id already exists, return { created: false } unchanged.
 * The whole insert runs in one transaction, so a retry that crashed mid-write
 * leaves no partial rows.
 */
export function insertResult(payload, { receivedAt } = {}) {
  const db = getDatabase();
  const received_at = receivedAt || nowUtc();

  const existing = db
    .prepare('SELECT test_id FROM tests WHERE test_id = ?')
    .get(payload.test_id);
  if (existing) {
    return { test_id: payload.test_id, created: false };
  }

  const insertTest = db.prepare(
    `INSERT INTO tests
       (test_id, started_at, ended_at, received_at, duration_ms, status, user_agent, browser, device)
     VALUES (@test_id, @started_at, @ended_at, @received_at, @duration_ms, @status, @user_agent, @browser, @device)`
  );
  const insertRegion = db.prepare(
    `INSERT INTO test_regions
       (test_id, region, endpoint_url, average_ms, p50_ms, p95_ms,
        success_count, fail_count, timeout_count, total_count)
     VALUES (@test_id, @region, @endpoint_url, @average_ms, @p50_ms, @p95_ms,
             @success_count, @fail_count, @timeout_count, @total_count)`
  );
  const insertSample = db.prepare(
    `INSERT INTO region_samples
       (test_id, region, seq, sent_at, latency_ms, status, error)
     VALUES (@test_id, @region, @seq, @sent_at, @latency_ms, @status, @error)`
  );

  const write = () => {
    insertTest.run({
      test_id: payload.test_id,
      started_at: payload.started_at,
      ended_at: payload.ended_at,
      received_at,
      duration_ms: payload.duration_ms ?? null,
      status: payload.status,
      user_agent: payload.user_agent ?? null,
      browser: payload.browser ?? null,
      device: payload.device ?? null,
    });

    for (const r of payload.regions || []) {
      insertRegion.run({
        test_id: payload.test_id,
        region: r.region,
        endpoint_url: r.endpoint_url,
        average_ms: r.average_ms ?? null,
        p50_ms: r.p50_ms ?? null,
        p95_ms: r.p95_ms ?? null,
        success_count: r.success_count ?? 0,
        fail_count: r.fail_count ?? 0,
        timeout_count: r.timeout_count ?? 0,
        total_count: r.total_count ?? 0,
      });
      const samples = Array.isArray(r.samples) ? r.samples : [];
      samples.forEach((s, i) => {
        insertSample.run({
          test_id: payload.test_id,
          region: r.region,
          seq: i,
          sent_at: s.sent_at,
          latency_ms: s.latency_ms ?? null,
          status: s.status,
          error: s.error ?? null,
        });
      });
    }
  };

  transaction(write);
  return { test_id: payload.test_id, created: true };
}

/** List tests (most recent first), paginated, with their regions attached. */
export function listTests({ limit = 50, offset = 0 } = {}) {
  const db = getDatabase();
  const tests = db
    .prepare('SELECT * FROM tests ORDER BY received_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  return tests.map(enrichTest);
}

/** Get a single test with its regions. */
export function getTest(test_id) {
  const db = getDatabase();
  const t = db.prepare('SELECT * FROM tests WHERE test_id = ?').get(test_id);
  if (!t) return null;
  return enrichTest(t);
}

function enrichTest(t) {
  const db = getDatabase();
  const regions = db
    .prepare('SELECT * FROM test_regions WHERE test_id = ? ORDER BY id')
    .all(t.test_id);
  return { ...t, regions };
}

/** Flat rows (one per region) for CSV export. */
export function exportRows({ limit = 100000, offset = 0 } = {}) {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT t.test_id, t.received_at, t.started_at, t.ended_at, t.duration_ms, t.status,
              t.browser, t.device, r.region, r.endpoint_url, r.average_ms, r.p50_ms, r.p95_ms,
              r.success_count, r.fail_count, r.timeout_count, r.total_count
       FROM tests t
       JOIN test_regions r ON r.test_id = t.test_id
       ORDER BY t.received_at DESC, r.region
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
}

export function countTests() {
  const db = getDatabase();
  return db.prepare('SELECT COUNT(*) AS n FROM tests').get().n;
}
