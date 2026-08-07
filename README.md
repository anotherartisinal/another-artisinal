# Another Artisanal

E-commerce site for **Another Artisanal** — considered men's apparel.
Static HTML/CSS/vanilla JS + Netlify Functions + Supabase + Stripe + Resend.
No build step, no framework.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture.

## Quick start

1. **Supabase** — create a project, open the SQL Editor, and run
   [`supabase-schema.sql`](./supabase-schema.sql) once. Grab the project URL, the
   **anon** key (client), and the **service_role** key (functions).
2. **Client config** — edit [`config.js`](./config.js): `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`. Put the Supabase host into the CSP
   `connect-src` in [`_headers`](./_headers).
3. **Env vars** — copy [`.env.example`](./.env.example) → `.env` for local dev, and set
   the same keys in Netlify (Site settings → Environment variables): Supabase service
   key, Stripe secret + webhook secret, Resend API key, admin password/secret. Shipping
   vars can stay blank.
4. **Deploy** — push to GitHub `main`; Netlify auto-deploys. Add the custom domain
   `anotherartisanal.eu` and point Netlify's DNS records in Cloudflare (DNS-only / grey
   cloud).
5. **Stripe webhook** — point it at the `stripe-webhook` function URL and enable
   `payment_intent.succeeded` + `payment_intent.payment_failed`; set
   `STRIPE_WEBHOOK_SECRET`.

## Local development

```bash
npm install       # only needed when editing netlify/functions/
netlify dev       # runs the site + functions with .env
```

## What's included vs. pending

**Included:** full storefront (grid / product / bag), Stripe checkout (EUR + PLN,
card/BLIK/P24), Supabase schema with RLS + guest-checkout RPCs, order/shipping/welcome/
magic-link emails via Resend, passwordless account area, admin panel (orders / products /
customers, with product create/edit/delete), newsletter, abandoned-cart + failed-payment
operator alerts, security headers + CSP, EN/PL + EUR/PLN.

**Pending:** carrier label-generation (InPost / DHL) — no carrier account yet; checkout
still charges shipping and records the method. Brand copy, images, and legal text are
placeholders. Marketing/SEO extras (sitemap, merchant feed, per-product edge meta) can be
added later — see `CLAUDE.md`.

⚠️ Never commit `.env` or any secret key. Only `config.js` (public keys) ships to the browser.
