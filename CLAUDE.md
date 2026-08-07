# CLAUDE.md — Another Artisanal

Guidance for Claude Code working in this repository.

---

## Overview

**Another Artisanal** (anotherartisanal.eu) is an e-commerce site for considered
**men's apparel** (jackets, trousers, knitwear). It mirrors the backend
architecture of the sibling `joshua-website` project, adapted for menswear.

- **Stack:** static HTML/CSS/vanilla JS (no framework, no build step) + Netlify
  Functions + Supabase + Stripe + Resend. Cloudflare for DNS/email.
- **Hosting:** Netlify, auto-deploys from `main`. No staging — push carefully or
  use `netlify deploy --alias=preview`.
- **Ships from:** Poland, worldwide (shipping structure mirrors joshua-website).
- **Currencies:** EUR (default) + PLN. **Languages:** EN (canonical) + PL.
- **Fulfillment note:** DHL/InPost carrier integrations are **not built yet** — no
  carrier account exists. Checkout charges the correct shipping and records the
  chosen method; label generation is manual until the shipping functions land
  (see "Shipping" below).

---

## Repository layout

```
index.html          SPA: home + collection grid + product detail + bag (data-page sections)
checkout.html       dedicated checkout (Stripe Elements)
account.html        magic-link sign-in + order history + saved address
admin.html          unlinked admin panel (orders / products / customers)
contact.html        contact
legal.html          terms / privacy / returns (placeholder copy)
config.js           PUBLIC client config (Supabase URL + anon key, Stripe pk) — placeholders
products.js         Supabase product fetch + stale-while-revalidate cache
app.js              cart, currency, routing (/products/<slug>), grid/detail/bag rendering
i18n.js             translations { en, pl } + t()/applyTranslations()
style.css           neutral menswear styles (restyle via :root variables)
_headers            security headers + CSP + cache rules
_redirects          /products/* rewrite + /terms /privacy
netlify.toml        build config + wsdl bundling + hourly abandoned-cart schedule
robots.txt          crawler policy
supabase-schema.sql ONE consolidated migration (tables + RLS + RPCs + seed)
netlify/functions/  serverless backend (see below)
.env.example        env var contract (copy to .env for netlify dev; NEVER commit .env)
```

### Netlify functions
- `create-payment-intent.js` — server-trusted pricing (from Supabase), currency-aware
  `payment_method_types` (PLN → card/blik/p24; EUR → card), shipping recompute.
- `stripe-webhook.js` — `payment_intent.succeeded` → order `pending→paid`, JSONB stock
  decrement, Resend buyer + admin emails; idempotency guard; `payment_intent.payment_failed`
  operator alert (deduped).
- `magic-link.js` / `send-welcome-email.js` / `account-data.js` — passwordless account.
- `newsletter-subscribe.js` — newsletter upsert.
- `abandoned-cart-alert.js` — hourly scheduled operator alert.
- `admin-auth.js` / `admin-orders.js` / `admin-products.js` / `admin-customers.js` /
  `admin-utils.js` — admin panel backend (HMAC token, rate limit, timing-safe compares,
  CORS locked to prod + previews + localhost).

---

## Data model (Supabase)

Base tables live **only** in `supabase-schema.sql` (run it once in the SQL Editor).

- **products** — `sizes` is a **JSONB ordered array** `[{"label","stock"}]` (NOT fixed
  size columns): arbitrary labels per product (EU 46–56 jackets, waist 30–38 pants,
  S–XL knitwear). Dual price: `price_eur` (cents) + `price_pln` (grosze, nullable →
  falls back to `price_eur × 4.30`). Dual copy: `*` + `*_pl`. Plus `category`,
  `has_back`, `extra_count`, `hs_code`, `sort_order`, `active`.
- **customers / orders / order_items** — RLS locked: anon has NO direct access; guest
  checkout writes flow through two `SECURITY DEFINER` RPCs (`upsert_pending_customer`,
  `create_pending_order`) that hard-lock `status='pending'` + `stripe_payment_id=NULL`.
  Authenticated users read their own rows via four `authenticated` policies (email-bound
  via `auth.jwt()`). Netlify functions use the service-role key and bypass RLS.
- **newsletter_subscribers** — service-role only.
- **decrement_stock(p_id, p_size, p_qty)** — atomic JSONB stock decrement called by the
  webhook (matches the size *label*, clamps at 0).

**If you add a client-side write surface, it MUST go through a new SECURITY DEFINER RPC —
direct REST from anon will 401.**

---

## Key behaviors / gotchas

- **Absolute resource paths everywhere.** The `/products/*` Netlify rewrite serves
  `index.html` for any `/products/...` URL, so a *relative* `style.css`/`app.js`/`images`
  reference breaks on direct visits to `/products/<slug>`. Always lead with `/`.
- **Stripe test↔live pairing.** `config.js` `STRIPE_PUBLISHABLE_KEY` must flip in the
  SAME commit as the `STRIPE_SECRET_KEY` env var, or Elements 400s.
- **CSP.** `_headers` carries an enforcing CSP. **Replace `YOUR_SUPABASE_PROJECT_REF`**
  in `_headers` connect-src with the real Supabase host. Adding any new third-party
  origin requires editing the CSP first. Any `_headers`/`netlify.toml` change should ship
  via `netlify deploy --alias=preview` + a checkout smoke test before `main`.
- **P24 (PLN) is redirect-based** — checkout persists order context to
  `localStorage['aa-pending-order']` before `confirmPayment` and rehydrates on the
  redirect-return via `payment_intent_client_secret`. Card + BLIK stay inline.
- **Pending order is always written EUR** at checkout time (the PLN toggle can change
  after); the webhook overwrites `orders.total`+`currency` from the authoritative
  PaymentIntent on the paid flip.
- **i18n cache.** `_headers` sets `i18n.js` to `no-cache` so new copy keys go live
  immediately; `style.css`/`app.js` inherit the 24h cache.
- **Brand constants** (email From, support address, legal entity, logo URL) are
  centralized in `netlify/functions/admin-utils.js` (imported by the email functions)
  and in a small block at the top of `stripe-webhook.js` (standalone). Client-side brand
  text lives in `i18n.js` + the HTML.

---

## Placeholders to replace before launch

- `config.js` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`.
- `_headers` — Supabase host in CSP connect-src.
- Netlify env vars — see `.env.example` (Supabase service key, Stripe secret + webhook
  secret, Resend key, admin password/secret). Shipping vars can stay blank until carriers exist.
- **Brand copy** — tagline, About story, legal pages, product copy/images are placeholders.
- **Legal entity** — `COMPANY_LEGAL` (in `admin-utils.js` + `stripe-webhook.js`) and the
  From/support email (`hello@anotherartisanal.eu`) assume a verified Resend domain +
  registered entity; confirm once incorporated.
- **Seed catalogue** — `supabase-schema.sql` seeds 6 placeholder SKUs; edit/replace via
  `/admin.html` (supports create/edit/delete) or re-run with real products.

---

## Shipping (not built yet)

Checkout offers country-aware methods and charges correctly:
- **PL:** InPost / DHL to address — free.
- **EU-27:** Standard free / Express €20.
- **Non-EU:** DHL Express — GB €25 · CH/NO €50 · rest €80 (mirrored in `checkout.html`
  `INTL_PRICE_EUR` and server-side `create-payment-intent.js` `INTL_SHIPPING_CENTS`).

Carrier **label-generation** functions (InPost ShipX, DHL24/Parcel Polska SOAP, DHL
Express MyDHL) are **not yet ported** — no carrier account exists. Until then, generate
labels manually. When accounts are ready, port them from `joshua-website` (the schema
already has the carrier pointer columns + `paczkomat_point`/`dhl24_servicepoint`).

---

## Local dev

```bash
npm install          # only when changing netlify/functions/
netlify dev          # preview with functions + env vars (needs .env)
```
No build step. Static pages can be previewed with any static server, but functions +
Supabase/Stripe need `netlify dev` + real keys.

## Working style
- Vanilla JS only, no frameworks, no build tooling. Mobile-first CSS.
- Confirm before large changes. Don't guess on checkout/payment/DB logic.
- snake_case Supabase columns, camelCase JS, kebab-case CSS.
