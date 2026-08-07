-- ============================================================
-- Another Artisanal — consolidated Supabase schema
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query).
--
-- Mirrors the joshua-website backend, adapted for:
--   • men's apparel with PER-PRODUCT arbitrary size lists (JSONB `sizes`)
--   • dual currency EUR (cents) + PLN (grosze)
--   • dual language EN + PL (`*_pl` columns)
--
-- Tables: products, customers, orders, order_items, newsletter_subscribers
-- Security: RLS locked down; guest writes flow through two SECURITY DEFINER
-- RPCs; only service-role (Netlify Functions) transitions order status.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. PRODUCTS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
  id                   TEXT PRIMARY KEY,
  slug                 TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  name_pl              TEXT,
  tagline              TEXT,
  tagline_pl           TEXT,
  price_eur            INTEGER NOT NULL,          -- euro cents  (19500 = €195)
  price_pln            INTEGER,                   -- grosze      (85000 = 850 zł); NULL → price_eur × PLN_FALLBACK_RATE
  category             TEXT,                      -- 'jacket' | 'pants' | 'jumper' | 'tshirt' | ...
  -- Per-product ordered size list. Each element: {"label": "<size>", "stock": <int>}
  -- Arbitrary labels: EU 46–56 (jackets), waist 30–38 (pants), S/M/L/XL (knitwear).
  sizes                JSONB NOT NULL DEFAULT '[]'::jsonb,
  composition          TEXT,
  composition_pl       TEXT,
  composition_lines    JSONB,
  composition_lines_pl JSONB,
  care                 TEXT,
  care_pl              TEXT,
  details              TEXT,
  details_pl           TEXT,
  has_back             BOOLEAN DEFAULT FALSE,     -- gates the -BACK.jpg view + home-grid hover-flip
  extra_count          INTEGER NOT NULL DEFAULT 0,-- number of editorial -BW1..3.jpg images (0–3)
  hs_code              TEXT,                      -- customs code for non-EU export declarations
  sort_order           INTEGER NOT NULL DEFAULT 0,
  active               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON products;
CREATE POLICY "Public read" ON products FOR SELECT USING (true);


-- ══════════════════════════════════════════════════════════════
-- 2. CUSTOMERS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  name               TEXT,
  country            TEXT,
  pref_lang          TEXT DEFAULT 'en',
  -- saved default address (single) + saved address book (multi)
  address_first_name TEXT,
  address_last_name  TEXT,
  address_line       TEXT,
  address_city       TEXT,
  address_postal     TEXT,
  address_country    TEXT,
  addresses          JSONB DEFAULT '[]'::jsonb,
  hidden_order_ids   JSONB DEFAULT '[]'::jsonb,
  pref_collections   BOOLEAN DEFAULT FALSE,
  pref_orders        BOOLEAN DEFAULT TRUE,
  pref_editorial     BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- 3. ORDERS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID REFERENCES customers(id),
  stripe_payment_id     TEXT,
  total                 NUMERIC,
  currency              TEXT DEFAULT 'EUR',
  status                TEXT DEFAULT 'pending',   -- 'pending' | 'paid' | 'shipped' | ...
  locale                TEXT DEFAULT 'en',
  -- buyer / billing
  billing_name          TEXT,
  billing_address       TEXT,
  billing_city          TEXT,
  billing_country       TEXT,
  billing_postal_code   TEXT,
  -- destination / shipping (= billing unless "ship to different address")
  shipping_name         TEXT,
  shipping_address      TEXT,
  shipping_city         TEXT,
  shipping_country      TEXT,
  shipping_postal_code  TEXT,
  shipping_phone        TEXT,
  shipping_email        TEXT,
  shipping_method       TEXT,
  tracking_number       TEXT,
  -- carrier pointers (populated once shipping integrations go live)
  paczkomat_point       TEXT,
  dhl24_servicepoint    TEXT,
  inpost_shipment_id    TEXT,
  dhl_shipment_id       TEXT,
  dhl24_shipment_id     TEXT,
  dhl_label_pdf         TEXT,
  dhl_invoice_pdf       TEXT,
  dhl24_label_pdf       TEXT,
  -- operator-alert dedupe stamps
  abandoned_alert_sent_at TIMESTAMPTZ,
  failed_alert_sent_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- composite index for the hourly abandoned-cart scan
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS orders_stripe_payment_idx ON orders (stripe_payment_id);


-- ══════════════════════════════════════════════════════════════
-- 4. ORDER ITEMS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT,
  product_name TEXT,
  size         TEXT,        -- free-text size label, matches products.sizes[].label
  quantity     INTEGER,
  price        NUMERIC      -- unit price in the charge currency (whole units)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);


-- ══════════════════════════════════════════════════════════════
-- 5. NEWSLETTER
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- no public policies → only the service-role Netlify function can read/write.


-- ══════════════════════════════════════════════════════════════
-- 6. RLS LOCKDOWN — customers / orders / order_items
--    Anon: no policies → no direct table access.
--    Authenticated (Supabase Auth on /account.html): read own data.
--    Service role (Netlify Functions): bypasses RLS.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth user reads own customer"    ON customers;
DROP POLICY IF EXISTS "Auth user updates own customer"  ON customers;
DROP POLICY IF EXISTS "Auth user reads own orders"      ON orders;
DROP POLICY IF EXISTS "Auth user reads own order_items" ON order_items;

CREATE POLICY "Auth user reads own customer"
  ON customers FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "Auth user updates own customer"
  ON customers FOR UPDATE TO authenticated
  USING      (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "Auth user reads own orders"
  ON orders FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT id FROM customers WHERE lower(email) = lower(auth.jwt() ->> 'email')
  ));

CREATE POLICY "Auth user reads own order_items"
  ON order_items FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE lower(c.email) = lower(auth.jwt() ->> 'email')
  ));
-- Deliberately no INSERT/UPDATE/DELETE for authenticated on orders/order_items.


-- ══════════════════════════════════════════════════════════════
-- 7. STOCK DECREMENT (JSONB sizes) — called by stripe-webhook.js
--    One atomic UPDATE under the row lock; clamps at 0.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_id   TEXT,
  p_size TEXT,
  p_qty  INTEGER
) RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET sizes = (
        SELECT jsonb_agg(
          CASE WHEN elem->>'label' = p_size
            THEN jsonb_set(elem, '{stock}',
                   to_jsonb(GREATEST(COALESCE((elem->>'stock')::int, 0) - p_qty, 0)))
            ELSE elem
          END
        )
        FROM jsonb_array_elements(sizes) AS elem
      ),
      updated_at = NOW()
  WHERE id = p_id;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- 8. GUEST-CHECKOUT RPC — upsert customer
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.upsert_pending_customer(
  p_email   TEXT,
  p_name    TEXT,
  p_country TEXT
) RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_email TEXT := lower(trim(coalesce(p_email, '')));
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF length(coalesce(p_name, '')) > 200 THEN
    RAISE EXCEPTION 'name too long';
  END IF;
  IF length(coalesce(p_country, '')) > 4 THEN
    RAISE EXCEPTION 'country too long';
  END IF;

  INSERT INTO customers (email, name, country)
  VALUES (v_email, p_name, p_country)
  ON CONFLICT (email) DO UPDATE
    SET name    = COALESCE(EXCLUDED.name,    customers.name),
        country = COALESCE(EXCLUDED.country, customers.country)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_pending_customer(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pending_customer(TEXT, TEXT, TEXT) TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════
-- 9. GUEST-CHECKOUT RPC — create pending order + items
--    Locked invariants: status='pending', stripe_payment_id=NULL.
--    Only stripe-webhook (service role) flips status to 'paid'.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_pending_order(
  p_customer_id        UUID,
  p_total              NUMERIC,
  p_currency           TEXT,
  p_locale             TEXT,
  p_billing_name       TEXT,
  p_billing_address    TEXT,
  p_billing_city       TEXT,
  p_billing_country    TEXT,
  p_billing_postal     TEXT,
  p_shipping_name      TEXT,
  p_shipping_address   TEXT,
  p_shipping_city      TEXT,
  p_shipping_country   TEXT,
  p_shipping_postal    TEXT,
  p_shipping_phone     TEXT,
  p_shipping_email     TEXT,
  p_shipping_method    TEXT,
  p_paczkomat_point    TEXT,
  p_dhl24_servicepoint TEXT,
  p_items              JSONB  -- [{product_id, product_name, size, quantity, price}, ...]
) RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_count    INT;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;

  v_count := jsonb_array_length(COALESCE(p_items, '[]'::jsonb));
  IF v_count = 0 OR v_count > 50 THEN
    RAISE EXCEPTION 'items must be 1..50';
  END IF;

  IF p_total IS NULL OR p_total < 0 OR p_total > 1000000 THEN
    RAISE EXCEPTION 'total out of range';
  END IF;

  INSERT INTO orders (
    customer_id, stripe_payment_id, total, currency, status, locale,
    billing_name, billing_address, billing_city, billing_country, billing_postal_code,
    shipping_name, shipping_address, shipping_city, shipping_country, shipping_postal_code,
    shipping_phone, shipping_email, shipping_method,
    paczkomat_point, dhl24_servicepoint
  ) VALUES (
    p_customer_id, NULL, p_total, upper(COALESCE(p_currency, 'EUR')), 'pending',
    COALESCE(p_locale, 'en'),
    p_billing_name, p_billing_address, p_billing_city, p_billing_country, p_billing_postal,
    p_shipping_name, p_shipping_address, p_shipping_city, p_shipping_country, p_shipping_postal,
    p_shipping_phone, p_shipping_email, p_shipping_method,
    p_paczkomat_point, p_dhl24_servicepoint
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, size, quantity, price)
  SELECT v_order_id,
         it->>'product_id',
         it->>'product_name',
         it->>'size',
         GREATEST(1, LEAST(50, (it->>'quantity')::INT)),
         (it->>'price')::NUMERIC
  FROM jsonb_array_elements(p_items) AS it;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_order(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_order(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════
-- 10. SEED — placeholder catalogue (men's apparel)
--     Replace copy/prices/images via /admin.html. Prices: EUR cents +
--     PLN grosze (round-number brand pricing, ≈ ×4.3 here as placeholder).
-- ══════════════════════════════════════════════════════════════
INSERT INTO products (id, slug, name, tagline, price_eur, price_pln, category, sizes, composition, care, details, hs_code, sort_order) VALUES
('AA-JK-01', 'field-jacket',        'Waxed Field Jacket',      'Placeholder tagline.', 32000, 138000, 'jacket',
  '[{"label":"46","stock":3},{"label":"48","stock":5},{"label":"50","stock":5},{"label":"52","stock":4},{"label":"54","stock":2},{"label":"56","stock":1}]'::jsonb,
  '100% Waxed Cotton', 'Wipe clean with a damp cloth. Do not machine wash. Re-wax annually.', 'Placeholder details · Four-pocket · Corozo buttons', '6201.40', 10),
('AA-JK-02', 'wool-overcoat',       'Wool Overcoat',           'Placeholder tagline.', 42000, 181000, 'jacket',
  '[{"label":"46","stock":2},{"label":"48","stock":4},{"label":"50","stock":4},{"label":"52","stock":3},{"label":"54","stock":2}]'::jsonb,
  '90% Wool / 10% Cashmere', 'Dry clean only. Brush after wear. Store on a wide hanger.', 'Placeholder details · Half-canvas · Horn buttons', '6201.11', 20),
('AA-PT-01', 'pleated-trouser',     'Pleated Trouser',         'Placeholder tagline.', 18000, 78000, 'pants',
  '[{"label":"30","stock":4},{"label":"32","stock":6},{"label":"34","stock":6},{"label":"36","stock":4},{"label":"38","stock":2}]'::jsonb,
  '98% Cotton / 2% Elastane', 'Machine wash cold, inside out. Hang to dry. Warm iron.', 'Placeholder details · Single pleat · Unfinished hem', '6203.42', 30),
('AA-PT-02', 'selvedge-jean',       'Selvedge Denim Jean',     'Placeholder tagline.', 16000, 69000, 'pants',
  '[{"label":"30","stock":5},{"label":"32","stock":7},{"label":"34","stock":7},{"label":"36","stock":5},{"label":"38","stock":3}]'::jsonb,
  '100% Cotton Selvedge Denim', 'Wash sparingly, cold, inside out. Hang to dry.', 'Placeholder details · 13.5oz · Button fly', '6203.42', 40),
('AA-JP-01', 'lambswool-jumper',    'Lambswool Crew Jumper',   'Placeholder tagline.', 14000, 60000, 'jumper',
  '[{"label":"S","stock":6},{"label":"M","stock":8},{"label":"L","stock":8},{"label":"XL","stock":4}]'::jsonb,
  '100% Lambswool', 'Handwash cold with wool detergent. Lie flat to dry.', 'Placeholder details · Ribbed collar · Fully fashioned', '6110.11', 50),
('AA-TS-01', 'heavy-cotton-tee',    'Heavyweight Cotton Tee',  'Placeholder tagline.',  6500,  28000, 'tshirt',
  '[{"label":"S","stock":10},{"label":"M","stock":14},{"label":"L","stock":14},{"label":"XL","stock":8}]'::jsonb,
  '100% Organic Cotton', 'Machine wash cold. Tumble dry low.', 'Placeholder details · 240gsm · Tubular knit', '6109.10', 60)
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 11. VERIFICATION (run after applying)
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--     WHERE schemaname='public' AND tablename IN ('customers','orders','order_items');
--     -- expect exactly 4 rows, all for the 'authenticated' role
-- ══════════════════════════════════════════════════════════════
