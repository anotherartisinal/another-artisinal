const crypto = require('crypto');

// ── Brand constants (single source of truth for functions that import this) ──
// TODO: confirm the verified Resend sending domain drives EMAIL_FROM /
// SUPPORT_EMAIL, and replace COMPANY_LEGAL with the registered entity.
const BRAND         = 'Another Artisanal';
const SITE_URL      = 'https://anotherartisanal.eu';
const EMAIL_FROM    = 'Another Artisanal <hello@anotherartisanal.eu>';
const SUPPORT_EMAIL = 'hello@anotherartisanal.eu';
const COMPANY_LEGAL = 'Another Artisanal';
const LOGO_URL      = `${SITE_URL}/images/logo-black.png`;

function createAdminToken() {
  // 2-hour expiry — short enough to limit a leaked token's blast radius,
  // long enough that the admin doesn't re-auth mid-session.
  const payload = JSON.stringify({ exp: Date.now() + 2 * 60 * 60 * 1000 });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.ADMIN_TOKEN_SECRET)
    .update(payloadB64).digest('base64url');
  return payloadB64 + '.' + sig;
}

function verifyAdminToken(event) {
  const auth = (event.headers.authorization || '').replace('Bearer ', '');
  if (!auth || !auth.includes('.')) return false;
  const [payloadB64, sig] = auth.split('.');
  const expected = crypto.createHmac('sha256', process.env.ADMIN_TOKEN_SECRET)
    .update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// Allowed origins: prod + Netlify preview deploys (per-deploy + per-branch
// hostnames match the regex). netlify-dev defaults to localhost:8888. Anything
// else falls back to the prod origin so we never echo an attacker origin.
const ALLOWED_ORIGINS = new Set([
  'https://anotherartisanal.eu',
  'https://www.anotherartisanal.eu',
  'http://localhost:8888',
]);
const NETLIFY_PREVIEW_RE = /^https:\/\/[a-z0-9-]+(?:--[a-z0-9-]+)?\.netlify\.app$/i;

function resolveOrigin(event) {
  const origin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (ALLOWED_ORIGINS.has(origin) || NETLIFY_PREVIEW_RE.test(origin)) return origin;
  return 'https://anotherartisanal.eu';
}

function corsHeaders(event, methods) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': methods || 'GET, POST, PATCH, OPTIONS',
    'Vary': 'Origin',
  };
}

// Static fallback for code paths without the event in scope. Locked to prod.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://anotherartisanal.eu',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Vary': 'Origin',
};

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = {
  createAdminToken, verifyAdminToken, CORS_HEADERS, corsHeaders, getSupabase,
  BRAND, SITE_URL, EMAIL_FROM, SUPPORT_EMAIL, COMPANY_LEGAL, LOGO_URL,
};
