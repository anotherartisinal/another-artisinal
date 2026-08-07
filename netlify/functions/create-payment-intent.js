const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});
const { createClient } = require('@supabase/supabase-js');

// Fallback used only when a product has no price_pln set (legacy / unconfigured).
// Brand-set PLN prices in products.price_pln always override; this is a
// belt-and-braces default so a NULL column never breaks PLN checkout.
const PLN_FALLBACK_RATE = 4.30;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, shipping, currency, customerEmail, pendingOrderId, customerName, shippingAddress, shippingCountry } = JSON.parse(event.body);

    if (!Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No items provided.' }),
      };
    }

    // Fetch trusted prices from Supabase (never trust client-sent prices)
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, price_eur, price_pln')
      .in('id', items.map(i => i.id));

    if (dbError) {
      console.error('Supabase error:', dbError.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to verify product prices.' }),
      };
    }

    const priceMap = {};
    (dbProducts || []).forEach(p => { priceMap[p.id] = { eur: p.price_eur, pln: p.price_pln }; });

    const useCurrency = (currency === 'pln') ? 'pln' : 'eur';

    // Per-item smallest-unit price in the charge currency. PLN reads
    // products.price_pln (grosze) directly; falls back to EUR×rate only if the
    // column is NULL (legacy / unconfigured product).
    function priceInChargeCurrency(productPriceObj) {
      if (useCurrency === 'pln') {
        if (productPriceObj.pln != null) return productPriceObj.pln;
        return Math.round(productPriceObj.eur * PLN_FALLBACK_RATE);
      }
      return productPriceObj.eur;
    }

    // Calculate total using server-side prices (ignore client-sent prices)
    let totalSmallUnits = 0;
    for (const item of items) {
      const priceObj = priceMap[item.id];
      if (!priceObj || priceObj.eur === undefined) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Unknown product: ${item.id}` }),
        };
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
      totalSmallUnits += priceInChargeCurrency(priceObj) * qty;
    }

    // Validate shipping method and use server-side price (EUR cents).
    //   PL:    InPost + DHL — free
    //   EU-27: Standard free / Express €20
    //   Non-EU: DHL Express, per-country (default €80)
    const VALID_SHIPPING = {
      'inpost_address': 0, 'inpost_paczkomat': 0,
      'dhl_address': 0, 'dhl_dropoff': 0,
      'eu_standard': 0, 'eu_express': 2000,
      'intl_express': 8000,
    };

    // Non-EU DHL Express (intl_express) is priced per destination country.
    // Mirror of checkout.html's INTL_SHIPPING_PRICE. Unlisted non-EU
    // destinations fall back to the VALID_SHIPPING default (€80).
    const INTL_SHIPPING_CENTS = { GB: 2500, CH: 5000, NO: 5000 };

    if (shipping && shipping.id) {
      let shippingCents = VALID_SHIPPING[shipping.id];
      if (shippingCents === undefined) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Unknown shipping method: ${shipping.id}` }),
        };
      }
      if (shipping.id === 'intl_express' && INTL_SHIPPING_CENTS[shippingCountry] != null) {
        shippingCents = INTL_SHIPPING_CENTS[shippingCountry];
      }
      if (shippingCents > 0) {
        // Shipping table is EUR cents; PLN converts at the fallback rate since
        // we don't keep per-method PLN shipping prices.
        const converted = useCurrency === 'pln' ? Math.round(shippingCents * PLN_FALLBACK_RATE) : shippingCents;
        totalSmallUnits += converted;
      }
    }

    // Minimum amount check
    if (totalSmallUnits < 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Order total is too low.' }),
      };
    }

    const itemDescriptions = items.map(i => `${i.name} (${i.size})`).join(', ');

    // Store trusted per-item prices in metadata in the actual charge currency
    // (smallest unit ÷ 100 → whole units). The webhook reads this back into
    // order_items.price. Product name is re-resolved server-side from
    // products.name on webhook, so large carts stay under Stripe's 500-char cap.
    const trustedItems = items.map(i => ({
      id: i.id,
      size: i.size,
      qty: Math.max(1, Math.floor(Number(i.quantity) || 0)),
      price: priceInChargeCurrency(priceMap[i.id]) / 100,
    }));

    // Surface PLN-native methods (BLIK, Przelewy24) when the customer toggles
    // to PLN. Card stays for everyone (Apple Pay / Google Pay tokenize through it).
    const paymentMethodTypes = useCurrency === 'pln'
      ? ['card', 'blik', 'p24']
      : ['card'];

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalSmallUnits,
      currency: useCurrency,
      payment_method_types: paymentMethodTypes,
      description: itemDescriptions,
      receipt_email: customerEmail || undefined,
      metadata: {
        pending_order_id: pendingOrderId || '',
        shipping_method: shipping ? shipping.id : 'eu_standard',
        customer_name: customerName || '',
        shipping_address: shippingAddress || '',
        currency: useCurrency,
        items: JSON.stringify(trustedItems),
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        total: totalSmallUnits,
      }),
    };
  } catch (err) {
    console.error('PaymentIntent error:', err);
    return {
      statusCode: err.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Payment processing error.' }),
    };
  }
};
