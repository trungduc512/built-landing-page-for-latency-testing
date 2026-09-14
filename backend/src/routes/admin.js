import { Router } from 'express';
import { listTests, getTest, exportRows, countTests } from '../db/repository.js';
import { requireAdmin } from '../lib/auth.js';
import { rowsToCsv } from '../lib/csv.js';

const router = Router();

// All admin routes require the bearer token.
router.use(requireAdmin);

// GET /api/admin/results?limit=50&offset=0
router.get('/results', (req, res) => {
  const limit = clampInt(req.query.limit, 50, 1, 500);
  const offset = clampInt(req.query.offset, 0, 0, 1_000_000);
  const tests = listTests({ limit, offset });
  res.json({ total: countTests(), limit, offset, tests });
});

// GET /api/admin/results/:test_id
router.get('/results/:test_id', (req, res) => {
  const t = getTest(req.params.test_id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

// GET /api/admin/export.csv
router.get('/export.csv', (req, res) => {
  const limit = clampInt(req.query.limit, 100000, 1, 1_000_000);
  const offset = clampInt(req.query.offset, 0, 0, 1_000_000);
  const rows = exportRows({ limit, offset });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="latency-results.csv"');
  res.send(rowsToCsv(rows));
});

function clampInt(v, def, min, max) {
  const n = Math.floor(Number(v));
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export default router;
