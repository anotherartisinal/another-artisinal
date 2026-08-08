# CLAUDE.md — Another Artisanal

Handoff + guidance for Claude Code. Read this first when resuming.

---

## What this is

**Another Artisanal** (anotherartisanal.eu) — e-commerce site for considered
**men's apparel** (jackets, trousers, knitwear). Backend architecture mirrors the
sibling `joshua-website` project; the front-end is a bespoke **editorial
smooth-scroll** design (see "Design" below).

- **Stack:** static HTML/CSS/vanilla JS (no framework, no build step) + Netlify
  Functions + Supabase + Stripe + Resend. Cloudflare for DNS (later).
- **Currencies:** EUR (default) + PLN. **Languages:** EN (canonical) + PL.
- **Fulfillment:** ships from Poland worldwide (shipping *structure* mirrors joshua;
  carrier label functions not built — no carrier account yet).

## ⚠️ Accounts — use the NEW brand accounts, not personal

Everything is under **new dedicated brand accounts** (brand Gmail
`anotherartisinal@gmail.com` + its GitHub/Netlify/Supabase), kept separate from
Josh's personal `joshuamjlong`. **Do NOT use `joshuamjlong` for this project.**
The machine's `gh` CLI is logged in as the personal account — do not use it here.

## Live / infra

- **Repo:** `github.com/anotherartisinal/another-artisinal` (private, branch `main`).
- **Live site (Netlify):** https://dancing-froyo-db2962.netlify.app (auto-deploys on
  push to `main`; project visibility = Public). Builds via `netlify.toml`
  (`npm install`, publish `.`).
- **Supabase project ref:** `vtfjbhwibpsowopqailg` (schema/RLS/seed applied + verified).
- **Custom domain** anotherartisanal.eu — not yet connected (needs Cloudflare DNS).

### Deploy (seamless now)
The brand PAT is stored in this repo's local `.git/config` remote URL (not committed),
so **`git push origin main` just works** → Netlify auto-builds (~10–30s). No token or
`gh` needed. Verify a deploy by polling the live URL for a marker string.

```bash
git add -A && git commit -m "…" && git push origin main
```

### Local dev / verify
```bash
python3 -m http.server 8099      # static preview (products load from live Supabase)
netlify dev                      # full preview WITH functions + .env
```
Headless render check (products need /products/* rewrite, so use a tiny rewrite server
for PDP — see git history of this session). Chrome headless:
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless --dump-dom URL`.

---

## Repo layout

```
index.html      SPA: visuals(home) · shop · manifesto · product detail · bag · subscribe
checkout.html   Stripe Elements checkout (has the EUR/PLN toggle in its summary)
account.html    magic-link sign-in + order history + saved address
admin.html      unlinked admin (orders / products / customers, incl. create/edit/delete)
contact.html · legal.html    static pages
config.js       PUBLIC client config: Supabase URL + anon key (set), Stripe pk (placeholder)
products.js     Supabase fetch + stale-while-revalidate cache (maps JSONB sizes, *_pl)
app.js          cart, currency, routing (/products/<slug>), all rendering, cart drawer
scroll.js       Lenis smooth-scroll engine (reduced-motion fallback; window.lenisResize/aaScrollTop)
i18n.js         translations { en, pl } + t()/applyTranslations()
style.css       editorial design system (tokens + components + compat aliases)
fonts/          Bau webfont (woff2): Regular/Italic/Medium/Bold/Super
images/editorial/  hero-01..03, manifesto (PLACEHOLDER imagery from design hand-off)
images/AA-*-FRONT.jpg  per-product photos (PLACEHOLDER)
_headers _redirects netlify.toml robots.txt   config
supabase-schema.sql   ONE consolidated migration (tables + RLS + RPCs + seed)
netlify/functions/    serverless backend (see below)
.env.example    env var contract (never commit .env)
```

### Netlify functions
`create-payment-intent.js` (trusted pricing, currency-aware methods, shipping recompute) ·
`stripe-webhook.js` (paid flip, JSONB stock decrement, Resend buyer+admin emails,
idempotency, failed-payment alert) · `magic-link.js` / `send-welcome-email.js` /
`account-data.js` · `newsletter-subscribe.js` · `abandoned-cart-alert.js` (hourly) ·
`admin-auth/orders/products/customers.js` + `admin-utils.js` (brand constants + CORS +
HMAC token). Brand email/legal constants live in `admin-utils.js` and the top of
`stripe-webhook.js`.

---

## Design (current — v3 editorial smooth-scroll)

Matched to the client's Claude Design screenshots (screenshots are the source of truth
over the raw bundle).

- **Type:** self-hosted **Bau** (grotesk). Bold caps for nav/labels/product names;
  **Bau Super** for the huge manifesto type. (Webfont license is the user's to confirm.)
- **Tokens:** bg `#fbfbfa` · fg `#111111` · muted `#8a8a86` · hairline `#e2e2de` ·
  image `#f2f2ef`. Radius 0, no shadows. (Old var names like `--ink/--paper/--mid-grey`
  are aliased in `:root` so earlier pages still style correctly.)
- **Smooth scroll:** Lenis 1.1.13 from unpkg (`scroll.js`), lerp 0.085, native touch
  momentum, **reduced-motion → engine off**. Never use CSS `scroll-behavior:smooth`.
  Call `window.lenisResize()` after layout shifts (routing/accordions/images) — app.js does.
- **Nav (all pages):** `VISUALS · SHOP · MANIFESTO` / `SUBSCRIBE · LOG IN · CART` + a
  **PL/EN** toggle only. No brand wordmark, no €/zł in nav. On the visuals page the nav
  is transparent + `mix-blend-mode:difference` over full-bleed photography; solid `#fbfbfa`
  elsewhere (`body.nav-blend` toggled by app.js). On index, **SHOP is a mega-menu trigger**
  (hover on desktop / tap on touch) opening the two-column category|material panel; while
  open, `body.menu-open` forces the nav solid. On the static pages SHOP is a plain
  `/#shop` link (no menu there).
- **Footer:** **locked white strip** (`position:fixed; bottom:0`) so content — including the
  full-bleed hero images — scrolls behind it. Links `HELP · LEGAL · INSTAGRAM · TIKTOK` +
  email/© row (Subscribe & Manifesto live in the header only). Hidden only on product detail
  (`body.hide-footer`; PDP has its own bottom card). Reverts to static in-flow on mobile
  (so it doesn't collide with the sticky bag bar).
- **Surfaces:** Visuals = full-bleed hero image scroll. Shop = edge-to-edge 3-col image
  grid (collapses 3→2→1). Product = full-bleed image(s) + **overlay info card** (size
  chips + Size/Description/Tag accordions with `*`⇄`×` markers + "Add to cart — {size}"
  → "Added" flash). Manifesto = 14 big-type principles, one per screen. Subscribe =
  newsletter surface.
- **Shop mega-menu + filters:** SHOP in the nav opens a full-width two-column panel
  (categories | materials) built by app.js from `TAXONOMY` (single source of truth;
  keep `admin.html`'s `CATEGORIES`/`MATERIALS` in sync). Clicking a term filters the
  shop grid. Both dimensions are **multi-valued** — products carry `categories`/`materials`
  JSONB arrays, so one item can appear under several filters. Filter is single-select and
  lives in the URL: `#shop`, `#shop/category/<slug>`, `#shop/material/<slug>` (shareable,
  back-button-safe). `products.js` falls back to mapping the legacy `category` → a category
  slug so live rows filter by category even before the migration runs; materials stay empty
  until then. ⚠️ **Run the taxonomy migration in `supabase-schema.sql`** (the `ALTER … ADD
  COLUMN IF NOT EXISTS categories/materials` + backfill block) in the Supabase SQL editor —
  the admin category/material checkboxes and material filters need those columns.
- **Cart** = slide-out drawer (+ overlay) opened by the nav Cart button / add-to-cart;
  mobile sticky bag bar. Bag page for the full view.
- **Footer** = **locked white strip**, `position:fixed; bottom:0` so content (incl. the
  full-bleed hero images) scrolls behind it; hidden only on product detail (PDP has its own
  bottom card). Static on mobile (avoids the sticky bag bar). Links: HELP · LEGAL · INSTAGRAM
  · TIKTOK (Subscribe/Manifesto live in the header only) + email/© row.
- **Static pages** (account/legal/contact/checkout) use the shared `.page-title` class
  (big bold Bau caps) instead of the old thin-serif inline headings; account.html now has
  the footer too.
- **Currency** toggle (EUR/PLN) lives in the **checkout** order-summary, not the nav.
- Mobile-first responsive throughout.

---

## Data model (Supabase) — run `supabase-schema.sql` once

- **products** — `sizes` is a **JSONB ordered array** `[{"label","stock"}]` (arbitrary
  labels: EU 46–56 jackets, waist 30–38 pants, S–XL knitwear). Dual price
  `price_eur` (cents) + `price_pln` (grosze, nullable → `price_eur × 4.30`). Dual copy
  `*` + `*_pl`. **Shop taxonomy** = two multi-valued JSONB arrays `categories` +
  `materials` (slugs; a product may carry several of each — this is what the mega-menu
  filters on). Legacy single `category` is kept for back-compat and as `products.js`'s
  fallback. Plus `has_back`, `extra_count`, `hs_code`, `sort_order`, `active`. Taxonomy
  columns + backfill were applied to the live DB (Aug 2026) via the migration block in
  `supabase-schema.sql`.
- **customers / orders / order_items** — RLS locked; anon has no table access; guest
  checkout writes go through 2 `SECURITY DEFINER` RPCs (`upsert_pending_customer`,
  `create_pending_order`). Auth users read own rows (email-bound). Functions use the
  service-role key. `decrement_stock(p_id, p_size, p_qty)` decrements the JSONB size.
- **newsletter_subscribers** — service-role only.
- Any new client write MUST go through a new RPC (direct anon REST 401s).

---

## Config / secrets

- **`config.js`** (public, committed): `SUPABASE_URL` ✓, `SUPABASE_ANON_KEY` ✓,
  `STRIPE_PUBLISHABLE_KEY` = **placeholder** (set when Stripe exists; flip in the same
  commit as the secret key).
- **Netlify env vars set:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, `ADMIN_NOTIFICATION_EMAIL`, and
  `SECRETS_SCAN_OMIT_KEYS=SUPABASE_URL` (the public URL legitimately appears in
  `config.js`/`_headers`, which Netlify's secret scan would otherwise flag).
- **Not set yet:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- CSP (`_headers`) allows Supabase (`vtfjbhwibpsowopqailg.supabase.co`), Stripe, unpkg
  (Lenis), InPost geowidget, OSM tiles. Add any new third-party origin here first.

---

## STATUS — resume here

**Working & live:** storefront (visuals/shop/product/manifesto/bag/subscribe), Bau type,
Lenis scroll, EN/PL, cart drawer, admin panel (`/admin.html`, log in with `ADMIN_PASSWORD`),
newsletter, all Supabase-backed functions, mobile. **Shop mega-menu + category/material
filtering** live end-to-end (taxonomy migration applied; 6 test SKUs tagged). Locked footer;
restyled static pages (login/legal/contact/checkout).

**Pending / next (nothing blocking):**
1. **Real photography** — biggest item. Current imagery in `images/editorial/` +
   `images/AA-*-FRONT.jpg` are PLACEHOLDERS from the design hand-off (extracted from a
   reference lookbook) — **must be replaced with owned/licensed photos before real launch.**
   Product images are `/images/<product-id>-FRONT.jpg` (+ `-BACK.jpg`, `-BW1..3.jpg`).
2. **Real products** — 6 placeholder SKUs seeded (AA-JK-01…AA-TS-01). Edit/replace via
   `/admin.html` (create/edit/delete) or re-seed. Tag each with its **categories/materials**
   (checkbox groups in the editor) so it shows under the right shop filters.
3. **Stripe** — no account yet. `create-payment-intent` returns 502 until `STRIPE_SECRET_KEY`
   is set (SDK throws at init with no key). Then set webhook + flip `config.js` pk.
4. **Resend** — needs a verified sending domain; account/order emails inactive until
   `RESEND_API_KEY` set.
5. **Custom domain** anotherartisanal.eu via Cloudflare (grey-cloud Netlify records).
6. **PL manifesto** — the 14 principles are English only (brand copy). Translate if wanted.
7. **Brand/legal copy** — legal.html + About/company/legal-entity are placeholders;
   `COMPANY_LEGAL` + From email assume a verified domain + registered entity.
8. **Shipping carrier functions** (InPost/DHL) — not built; checkout charges shipping +
   records the method; labels are manual until carrier accounts exist. Port from
   `joshua-website` when ready (schema already has the carrier pointer columns).

## Gotchas
- Absolute resource paths only (`/style.css`, `/app.js`, `/images/…`) — the `/products/*`
  rewrite serves index.html for any such path, so relative paths break on PDP URLs.
- Stripe test↔live: flip `config.js` pk + `STRIPE_SECRET_KEY` together.
- `i18n.js` is `no-cache` in `_headers`; `style.css`/`app.js` inherit a 24h cache.

## Working style
Vanilla JS only, no frameworks/build. Mobile-first. Confirm before large changes; don't
guess on checkout/payment/DB logic. Deploy = commit + `git push origin main`.
