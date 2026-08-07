const crypto = require('crypto');
const { createAdminToken, verifyAdminToken, corsHeaders } = require('./admin-utils');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a == null ? '' : a));
  const bb = Buffer.from(String(b == null ? '' : b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// In-memory per-IP rate limiter. Lossy across cold starts but adequate as a
// soft throttle. Pair with a strong ADMIN_PASSWORD.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

function getClientIp(event) {
  return (event.headers['x-nf-client-connection-ip'])
    || ((event.headers['x-forwarded-for'] || '').split(',')[0].trim())
    || 'unknown';
}
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  attempts.set(ip, recent);
  return recent.length >= MAX_ATTEMPTS;
}
function recordAttempt(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
}
function clearAttempts(ip) { attempts.delete(ip); }

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  const headers = { ...corsHeaders(event), 'Content-Type': 'application/json' };

  // POST — login with password
  if (event.httpMethod === 'POST') {
    const ip = getClientIp(event);
    if (isRateLimited(ip)) {
      console.warn('admin-auth: rate-limited IP', ip);
      return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many attempts. Try again in 15 minutes.' }) };
    }
    try {
      const { password } = JSON.parse(event.body);
      if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
        recordAttempt(ip);
        console.warn('admin-auth: failed login from', ip);
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };
      }
      clearAttempts(ip);
      return { statusCode: 200, headers, body: JSON.stringify({ token: createAdminToken() }) };
    } catch {
      recordAttempt(ip);
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  // GET — verify token
  if (event.httpMethod === 'GET') {
    if (!verifyAdminToken(event)) {
      return { statusCode: 401, headers, body: JSON.stringify({ valid: false }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ valid: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
