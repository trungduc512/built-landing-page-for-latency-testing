const COLUMNS = [
  'test_id', 'received_at', 'started_at', 'ended_at', 'duration_ms', 'status',
  'browser', 'device', 'region', 'endpoint_url', 'average_ms', 'p50_ms', 'p95_ms',
  'success_count', 'fail_count', 'timeout_count', 'total_count',
];

function escapeCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize an array of row objects into RFC-4180-ish CSV (CRLF line endings). */
export function rowsToCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => escapeCell(r[c])).join(','));
  }
  return lines.join('\r\n');
}
