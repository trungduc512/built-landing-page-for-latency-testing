// Validates the POST /api/results payload.
// Returns { ok: true, value } or { ok: false, errors: string[] }.

export function validateResult(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload must be a JSON object'] };
  }

  if (typeof payload.test_id !== 'string' || !payload.test_id) {
    errors.push('test_id is required (string)');
  }
  if (typeof payload.started_at !== 'string' || !payload.started_at) {
    errors.push('started_at is required (ISO string)');
  }
  if (typeof payload.ended_at !== 'string' || !payload.ended_at) {
    errors.push('ended_at is required (ISO string)');
  }
  if (
    payload.duration_ms !== null &&
    payload.duration_ms !== undefined &&
    typeof payload.duration_ms !== 'number'
  ) {
    errors.push('duration_ms must be a number or null');
  }
  if (payload.status !== 'completed' && payload.status !== 'interrupted') {
    errors.push("status must be 'completed' or 'interrupted'");
  }
  if (!Array.isArray(payload.regions)) {
    errors.push('regions must be an array');
  } else {
    payload.regions.forEach((r, i) => {
      const prefix = `regions[${i}]`;
      if (typeof r.region !== 'string' || !r.region)
        errors.push(`${prefix}.region is required`);
      if (typeof r.endpoint_url !== 'string' || !r.endpoint_url)
        errors.push(`${prefix}.endpoint_url is required`);
      if (!Array.isArray(r.samples)) errors.push(`${prefix}.samples must be an array`);
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: payload };
}
