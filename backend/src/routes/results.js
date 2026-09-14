import { Router } from 'express';
import { insertResult } from '../db/repository.js';
import { validateResult } from '../lib/validation.js';

const router = Router();

// POST /api/results — store one test result. Idempotent by test_id.
router.post('/results', (req, res) => {
  const validation = validateResult(req.body);
  if (!validation.ok) {
    return res
      .status(400)
      .json({ error: 'invalid payload', details: validation.errors });
  }

  const payload = validation.value;
  const userAgent = req.get('user-agent') || null;
  const enriched = {
    ...payload,
    user_agent: payload.user_agent || userAgent,
    browser: payload.browser || parseBrowser(userAgent),
    device: payload.device || parseDevice(userAgent),
  };

  try {
    const result = insertResult(enriched, { receivedAt: new Date().toISOString() });
    return res
      .status(result.created ? 201 : 200)
      .json({ ok: true, test_id: result.test_id, created: result.created });
  } catch (err) {
    // A duplicate test_id from a race surfaces as SQLITE_CONSTRAINT_PRIMARYKEY;
    // treat that as idempotent success.
    if (String(err?.code || '').includes('CONSTRAINT')) {
      return res.status(200).json({ ok: true, test_id: payload.test_id, created: false });
    }
    console.error('[results] insert failed:', err);
    return res.status(500).json({ error: 'storage failed' });
  }
});

function parseBrowser(ua) {
  if (!ua) return null;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  return null;
}

function parseDevice(ua) {
  if (!ua) return null;
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/mobile/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

export default router;
