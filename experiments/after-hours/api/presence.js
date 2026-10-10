import { sanitizePresence } from '../lib/presence-sanitize.mjs';
// Public Lanyard user ID, verified against kalieri.com's existing phone record.
// No VRChat credentials or Lanyard write key are needed by this read-only API.
const OWNER = '860859306156490762';
export function createPresenceHandler({ fetcher = (...args) => fetch(...args) } = {}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');res.statusCode = 405;
      res.end(JSON.stringify({ success: false, error: 'method_not_allowed' }));return;
    }
    try {
      const response = await fetcher(`https://api.lanyard.rest/v1/users/${OWNER}`, {
        signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'AFTER-HOURS/1.0 (+https://kalieri.com)' },
      });
      if (!response.ok) throw new Error('upstream');
      const payload = await response.json();
      const data = payload?.success === true ? sanitizePresence(payload.data) : null;
      if (!data) throw new Error('invalid_payload');
      res.statusCode = 200;
      // Never change observedAt. Client-side expiry still applies to cached data.
      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5');
      res.end(JSON.stringify({ success: true, data }));
    } catch {
      res.statusCode = 503;
      res.end(JSON.stringify({ success: false, error: 'presence_unavailable' }));
    }
  };
}
export default createPresenceHandler();
