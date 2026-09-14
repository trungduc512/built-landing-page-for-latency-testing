import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDatabase, closeDatabase } from '../src/db/database.js';
import { insertResult, getTest, countTests } from '../src/db/repository.js';
import { testExists } from '../src/lib/idempotency.js';
import { rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmpDir = join(tmpdir(), `latency-idem-${Date.now()}`);
const dbPath = join(tmpDir, 'test.db');

const sample = {
  test_id: 'id-1',
  started_at: '2025-01-01T00:00:00Z',
  ended_at: '2025-01-01T00:01:00Z',
  duration_ms: 60000,
  status: 'completed',
  regions: [
    {
      region: 'huawei',
      endpoint_url: 'https://huawei-test.example.com/latency',
      average_ms: 120,
      p50_ms: 110,
      p95_ms: 200,
      success_count: 10,
      fail_count: 0,
      timeout_count: 0,
      total_count: 10,
      samples: [
        { sent_at: '2025-01-01T00:00:00Z', latency_ms: 100, status: 'success', error: null },
        { sent_at: '2025-01-01T00:00:01Z', latency_ms: 140, status: 'success', error: null },
      ],
    },
  ],
};

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
  openDatabase(dbPath);
});

afterAll(() => {
  closeDatabase();
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('repository idempotency', () => {
  it('inserts a new result', () => {
    const r = insertResult(sample);
    expect(r.created).toBe(true);
    expect(countTests()).toBe(1);
    expect(testExists('id-1')).toBe(true);
  });

  it('does not duplicate on re-insert with the same test_id', () => {
    const r = insertResult(sample);
    expect(r.created).toBe(false);
    expect(countTests()).toBe(1);
    const t = getTest('id-1');
    expect(t).not.toBeNull();
    expect(t.regions).toHaveLength(1);
    expect(t.regions[0].success_count).toBe(10);
  });

  it('stores a separate result for a different test_id', () => {
    const other = { ...sample, test_id: 'id-2' };
    const r = insertResult(other);
    expect(r.created).toBe(true);
    expect(countTests()).toBe(2);
  });
});
