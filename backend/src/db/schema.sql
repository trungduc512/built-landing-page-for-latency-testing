-- Schema for latency test results.
-- One test session has many regions; each region has many samples.

CREATE TABLE IF NOT EXISTS tests (
  test_id      TEXT PRIMARY KEY,
  started_at   TEXT NOT NULL,
  ended_at     TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  duration_ms  INTEGER,
  status       TEXT NOT NULL CHECK (status IN ('completed', 'interrupted')),
  user_agent   TEXT,
  browser      TEXT,
  device       TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS test_regions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id        TEXT NOT NULL REFERENCES tests(test_id) ON DELETE CASCADE,
  region         TEXT NOT NULL,
  endpoint_url   TEXT NOT NULL,
  average_ms     REAL,
  p50_ms         REAL,
  p95_ms         REAL,
  success_count  INTEGER NOT NULL DEFAULT 0,
  fail_count     INTEGER NOT NULL DEFAULT 0,
  timeout_count  INTEGER NOT NULL DEFAULT 0,
  total_count    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (test_id, region)
);

CREATE TABLE IF NOT EXISTS region_samples (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id     TEXT NOT NULL,
  region      TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  sent_at     TEXT NOT NULL,
  latency_ms  REAL,
  status      TEXT NOT NULL CHECK (status IN ('success', 'fail', 'timeout')),
  error       TEXT
);

CREATE INDEX IF NOT EXISTS idx_regions_test ON test_regions(test_id);
CREATE INDEX IF NOT EXISTS idx_samples_test_region ON region_samples(test_id, region);
CREATE INDEX IF NOT EXISTS idx_tests_received ON tests(received_at);
