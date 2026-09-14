import { config } from '../config.js';

// Express middleware requiring a valid bearer token for admin endpoints.
export function requireAdmin(req, res, next) {
  if (!config.adminToken) {
    return res
      .status(503)
      .json({ error: 'admin endpoints disabled (ADMIN_TOKEN not set)' });
  }
  const auth = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m || m[1] !== config.adminToken) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}
