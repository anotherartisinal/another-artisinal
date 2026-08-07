// ── Client-side PUBLIC config ───────────────────────────────────────────────
// These are public keys, safe to ship in the browser:
//   • Supabase anon key — RLS blocks all direct table access (see supabase-schema.sql)
//   • Stripe publishable key — pairs with STRIPE_SECRET_KEY; flip test↔live TOGETHER
//
// ⚠️ REPLACE the placeholders below before deploy, and mirror the Supabase host
// into the CSP connect-src in `_headers`.
window.AA_CONFIG = {
  SUPABASE_URL: 'https://vtfjbhwibpsowopqailg.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZmpiaHdpYnBzb3dvcHFhaWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwODQ0NjgsImV4cCI6MjEwMTY2MDQ2OH0.X4CPFNucc2KFXEJ1fsZEmUx9pOWRPXfgGZpAnmir7tQ',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
};
