import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/server.js';
import { openDatabase, closeDatabase } from '../src/db/database.js';
import { countTests } from '../src/db/repository.js';
import { rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmpDir = join(tmpdir(), `latency-http-${Date.now()}`);
const dbPath = join(tmpDir, 'test.db');
let server;
let baseUrl;

const baseResult = {
  test_id: 'tid-1',
  started_at: '2025-01-01T00:00:00Z',
  ended_at: '2025-01-01T00:01:00Z',
  duration_ms: 60000,
  status: 'completed',
  regions: [
    {
      region: 'huawei',
      endpoint_url: 'https://huawei-test.example.com/latency',
      average_ms: 100,
      p50_ms: 100,
      p95_ms: 100,
      success_count: 1,
      fail_count: 0,
      timeout_count: 0,
      total_count: 1,
      samples: [
        { sent_at: '2025-01-01T00:00:00Z', latency_ms: 100, status: 'success', error: null },
      ],
    },
    {
      region: 'aws',
      endpoint_url: 'https://aws-test.example.com/latency',
      average_ms: null,
      p50_ms: null,
      p95_ms: null,
      success_count: 0,
      fail_count: 1,
      timeout_count: 0,
      total_count: 1,
      samples: [
        { sent_at: '2025-01-01T00:00:00Z', latency_ms: null, status: 'fail', error: 'timeout' },
      ],
    },
  ],
};

beforeAll(async () => {
  mkdirSync(tmpDir, { recursive: true });
  openDatabase(dbPath);
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  closeDatabase();
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('POST /api/results', () => {
  it('accepts a valid result (201)', async () => {
    const res = await fetch(`${baseUrl}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseResult),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.created).toBe(true);
    expect(countTests()).toBe(1);
  });

  it('is idempotent on repeated test_id (200, not created)', async () => {
    const res = await fetch(`${baseUrl}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseResult),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.created).toBe(false);
    expect(countTests()).toBe(1);
  });

  it('rejects an invalid payload (400)', async () => {
    const res = await fetch(`${baseUrl}/api/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_id: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 503 for admin endpoints when ADMIN_TOKEN is not set', async () => {
    const res = await fetch(`${baseUrl}/api/admin/results`);
    expect(res.status).toBe(503);
  });

  it('has a working health check', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
