const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Brand constants (edit here) ────────────────────────────────────────────
// TODO: replace COMPANY_LEGAL with the registered legal entity once incorporated,
// and confirm the verified Resend sending domain drives EMAIL_FROM / SUPPORT_EMAIL.
const BRAND         = 'Another Artisanal';
const SITE_URL      = 'https://anotherartisanal.eu';
const EMAIL_FROM    = 'Another Artisanal <hello@anotherartisanal.eu>';
const SUPPORT_EMAIL = 'hello@anotherartisanal.eu';
const COMPANY_LEGAL = 'Another Artisanal';
const LOGO_URL      = `${SITE_URL}/images/logo-black.png`;

// ── Meta Conversions API — server-side Purchase (no-op unless env set) ──────
// Mirrors a future browser Pixel Purchase for reliability. Shares
// event_id = order.id so Meta dedupes browser + server copies. Fully no-op
// unless BOTH META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set.
function sha256(v) {
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}
async function sendMetaCapiPurchase({ orderId, email, amount, currency, itemsData }) {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return; // not configured yet — no-op

  const userData = {};
  if (email) userData.em = [sha256(email)];

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: orderId,
      action_source: 'website',
      event_source_url: `${SITE_URL}/checkout.html`,
      user_data: userData,
      custom_data: {
        currency: (currency || 'EUR').toUpperCase(),
        value: amount,
        content_type: 'product',
        content_ids: (itemsData || []).map(i => i.id).filter(Boolean),
        num_items: (itemsData || []).reduce((s, i) => s + (i.qty || i.quantity || 1), 0),
      },
    }],
  };

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error('Meta CAPI Purchase failed:', res.status, await res.text());
}

// Lang-aware shipping labels for the buyer email. EN is canonical; PL overrides
// per-key and falls back to EN via pickShipping(). Admin email always uses EN.
// Mirror of client i18n shipping_* keys — keep in sync if you change labels.
const SHIPPING_LABELS = {
  en: {
    inpost_address:    { name: 'InPost — to address',    estimate: '1–2 business days' },
    inpost_paczkomat:  { name: 'InPost — Paczkomat',     estimate: 'Next business day' },
    dhl_address:       { name: 'DHL — to address',       estimate: '1–2 business days' },
    dhl_dropoff:       { name: 'DHL — drop-off point',   estimate: '1–2 business days' },
    eu_standard:       { name: 'Standard delivery',      estimate: '3–6 business days' },
    eu_express:        { name: 'Express delivery',       estimate: '1–2 business days' },
    intl_express:      { name: 'DHL Express delivery',   estimate: '2–4 business days' },
  },
  pl: {
    inpost_address:    { name: 'InPost — pod adres',     estimate: '1–2 dni robocze' },
    inpost_paczkomat:  { name: 'InPost — Paczkomat',     estimate: 'Następny dzień roboczy' },
    dhl_address:       { name: 'DHL — pod adres',        estimate: '1–2 dni robocze' },
    dhl_dropoff:       { name: 'DHL — punkt odbioru',    estimate: '1–2 dni robocze' },
    eu_standard:       { name: 'Dostawa standardowa',    estimate: '3–6 dni roboczych' },
    eu_express:        { name: 'Dostawa ekspresowa',     estimate: '1–2 dni robocze' },
    intl_express:      { name: 'Dostawa DHL Express',    estimate: '2–4 dni robocze' },
  },
};

// Lang-aware email copy. EN canonical; PL overrides per-string, falls back to EN.
const I18N = {
  en: {
    subject: `Your ${BRAND} order is confirmed`,
    page_title: `Your ${BRAND} order is confirmed`,
    intro: (firstName) => `Thank you for your order${firstName ? ', ' + firstName : ''}. We are preparing it with care and will dispatch it shortly.`,
    your_order_label: 'Your order',
    order_confirmed_fallback: 'Order confirmed',
    item_size_separator: ' &mdash; Size ',
    item_qty_separator: ' &times; ',
    shipping_label: 'Shipping',
    estimated_delivery_label: 'Estimated delivery',
    total_label: 'Total',
    delivering_to_label: 'Delivering to',
    track_title: 'Track your order',
    track_note: 'Once your order has been dispatched, you will receive a separate email with your tracking number and a link to follow your delivery.',
    care_title: 'Caring for your pieces',
    care_p1: 'Our garments are made to last. Follow the care label on each piece — most benefit from a cold, gentle wash and being laid flat or hung to dry. Avoid harsh heat, which can shorten the life of natural fibres and hardware over time.',
    care_p2: 'Kept well, these pieces are meant to stay with you for years. Reach out any time if you would like care advice for a specific fabric.',
    support_prefix: 'If you have any questions about your order, contact us at ',
    support_suffix: '.',
  },
  pl: {
    subject: `Twoje zamówienie ${BRAND} zostało potwierdzone`,
    page_title: `Twoje zamówienie ${BRAND} zostało potwierdzone`,
    intro: (firstName) => `Dziękujemy za zamówienie${firstName ? ', ' + firstName : ''}. Przygotowujemy je starannie i wkrótce wyślemy.`,
    your_order_label: 'Twoje zamówienie',
    order_confirmed_fallback: 'Zamówienie potwierdzone',
    item_size_separator: ' &mdash; Rozmiar ',
    item_qty_separator: ' &times; ',
    shipping_label: 'Wysyłka',
    estimated_delivery_label: 'Szacowana dostawa',
    total_label: 'Razem',
    delivering_to_label: 'Dostawa do',
    track_title: 'Śledź swoje zamówienie',
    track_note: 'Gdy Twoje zamówienie zostanie wysłane, otrzymasz osobny e-mail z numerem śledzenia i linkiem do śledzenia dostawy.',
    care_title: 'Pielęgnacja Twoich ubrań',
    care_p1: 'Nasze ubrania powstają, by służyć długo. Kieruj się metką na każdej sztuce — większość najlepiej prać w zimnej wodzie w delikatnym programie i suszyć na płasko lub na wieszaku. Unikaj wysokiej temperatury, która z czasem skraca żywotność naturalnych włókien i okuć.',
    care_p2: 'Dobrze pielęgnowane, te ubrania posłużą Ci przez lata. Napisz do nas, jeśli potrzebujesz porady dla konkretnej tkaniny.',
    support_prefix: 'Jeśli masz pytania dotyczące zamówienia, napisz do nas na ',
    support_suffix: '.',
  },
};

function pickLang(lang) {
  return Object.assign({}, I18N.en, I18N[lang] || {});
}
function pickShipping(lang, methodId) {
  return (SHIPPING_LABELS[lang] && SHIPPING_LABELS[lang][methodId])
    || SHIPPING_LABELS.en[methodId]
    || { name: 'Standard shipping', estimate: '2–5 business days' };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object;

    try {
      const metadata = paymentIntent.metadata || {};
      const pendingOrderId = metadata.pending_order_id;
      const shippingMethodId = metadata.shipping_method;
      const customerName = metadata.customer_name || '';
      const rawItemsData = metadata.items ? JSON.parse(metadata.items) : [];

      // Re-hydrate product names from the products table (not packed in metadata).
      const productIds = rawItemsData.map(i => i.id).filter(Boolean);
      let nameMap = {};
      if (productIds.length > 0) {
        const { data: productRows } = await supabase
          .from('products').select('id, name').in('id', productIds);
        (productRows || []).forEach(p => { nameMap[p.id] = p.name; });
      }
      const itemsData = rawItemsData.map(i => ({ ...i, name: i.name || nameMap[i.id] || 'Item' }));

      const customerDetails = { email: paymentIntent.receipt_email || '', name: customerName };

      // Fetch pending order if present.
      let orderData = null;
      if (pendingOrderId) {
        const { data: existingOrder } = await supabase
          .from('orders').select('*, customers(*)').eq('id', pendingOrderId).single();
        if (existingOrder) orderData = existingOrder;
      }

      // Idempotency guard — Stripe retries webhooks; short-circuit if already paid.
      if (orderData && orderData.status === 'paid') {
        console.log('Webhook retry — already-paid order, skipping:', pendingOrderId);
        return { statusCode: 200, body: JSON.stringify({ received: true, deduplicated: true }) };
      }

      const lang = (orderData && orderData.locale) || 'en';
      const t = pickLang(lang);
      const shippingInfo = pickShipping(lang, shippingMethodId);

      const emailForCustomer = customerDetails.email || (orderData && orderData.customers && orderData.customers.email) || '';
      const nameForCustomer = customerName || (orderData && orderData.customers && orderData.customers.name) || (orderData && orderData.billing_name) || '';
      const countryForCustomer = (orderData && orderData.customers && orderData.customers.country) || (orderData && orderData.billing_country) || '';

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({ email: emailForCustomer, name: nameForCustomer, country: countryForCustomer }, { onConflict: 'email' })
        .select().single();
      if (customerError) throw customerError;

      // Update pending order, or insert a new one if the checkout RPC had failed.
      let order;
      if (pendingOrderId) {
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({
            stripe_payment_id: paymentIntent.id,
            status: 'paid',
            // Persist what was actually charged (pending order is written EUR at
            // checkout time, before the PL customer can pick PLN). PI is authoritative.
            total: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          })
          .eq('id', pendingOrderId).select().single();
        if (updateError) throw updateError;
        order = updatedOrder;
      } else {
        // Guard against a retry double-inserting for the same PI.
        const { data: dupRows } = await supabase
          .from('orders').select('id').eq('stripe_payment_id', paymentIntent.id).limit(1);
        if (dupRows && dupRows.length) {
          console.log('Webhook retry — order already inserted for PI, skipping:', paymentIntent.id);
          return { statusCode: 200, body: JSON.stringify({ received: true, deduplicated: true }) };
        }
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: customer.id,
            stripe_payment_id: paymentIntent.id,
            total: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            status: 'paid',
            shipping_name: nameForCustomer,
            shipping_address: metadata.shipping_address || '',
            shipping_method: shippingMethodId,
          })
          .select().single();
        if (orderError) throw orderError;
        order = newOrder;

        if (itemsData.length > 0) {
          const orderItems = itemsData.map(item => ({
            order_id: order.id,
            product_id: item.id || item.product_id || null,
            product_name: item.name,
            size: item.size,
            quantity: item.qty,
            price: item.price,
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
          if (itemsError) throw itemsError;
        }
      }

      console.log('Order saved to Supabase:', order.id);

      try {
        await sendMetaCapiPurchase({
          orderId: order.id, email: emailForCustomer,
          amount: paymentIntent.amount / 100, currency: paymentIntent.currency, itemsData,
        });
      } catch (capiErr) { console.error('Meta CAPI Purchase threw (ignored):', capiErr.message); }

      // ── Decrement stock (JSONB sizes) — any size label, not fixed columns ──
      for (const item of itemsData) {
        const productId = item.id || item.product_id;
        const size = item.size;
        const qty = item.qty || item.quantity || 1;
        if (productId && size) {
          await supabase.rpc('decrement_stock', { p_id: productId, p_size: String(size), p_qty: qty });
        }
      }

      // ── Confirmation email (Resend) ──
      const firstName = (nameForCustomer || '').split(' ')[0];
      const total = (paymentIntent.amount / 100).toFixed(0);
      const chargeCurrency = (paymentIntent.currency || 'eur').toUpperCase();
      const currencySymbol = chargeCurrency === 'PLN' ? 'zł' : '€';
      const itemLineTotal = (item) => Math.round(item.price * item.qty);

      const itemsHtml = itemsData.map(item => {
        const price = itemLineTotal(item);
        return `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e8e8e6;font-size:13px;color:#444;letter-spacing:0.02em;">
              ${item.name}${item.size ? t.item_size_separator + item.size : ''}${item.qty > 1 ? t.item_qty_separator + item.qty : ''}
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #e8e8e6;font-size:13px;color:#444;text-align:right;white-space:nowrap;">
              ${currencySymbol}${price}
            </td>
          </tr>`;
      }).join('') || `<tr><td colspan="2" style="padding:10px 0;font-size:13px;color:#444;">${t.order_confirmed_fallback}</td></tr>`;

      const emailHtml = `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${t.page_title}</title></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
        <tr><td style="padding:40px 48px 32px;border-bottom:1px solid #e8e8e6;text-align:center;">
          <img src="${LOGO_URL}" alt="${BRAND}" style="height:28px;width:auto;display:block;margin:0 auto 12px;"/>
        </td></tr>
        <tr><td style="padding:36px 48px 28px;">
          <p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0;">${t.intro(firstName)}</p>
        </td></tr>
        <tr><td style="padding:0 48px 28px;">
          <div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:16px;">${t.your_order_label}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
            <tr>
              <td style="padding:16px 0 4px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#999;">${t.shipping_label}</td>
              <td style="padding:16px 0 4px;font-size:12px;color:#444;text-align:right;">${shippingInfo.name}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:11px;color:#999;letter-spacing:0.02em;">${t.estimated_delivery_label}</td>
              <td style="padding:4px 0;font-size:11px;color:#999;text-align:right;">${shippingInfo.estimate}</td>
            </tr>
            <tr>
              <td style="padding:20px 0 4px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#0a0a0a;border-top:1px solid #e8e8e6;">${t.total_label}</td>
              <td style="padding:20px 0 4px;font-size:16px;color:#0a0a0a;text-align:right;border-top:1px solid #e8e8e6;">${currencySymbol}${total}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 48px 36px;">
          <div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">${t.delivering_to_label}</div>
          <div style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;">
            ${orderData ? (orderData.shipping_name || nameForCustomer) : nameForCustomer}<br/>
            ${orderData ? orderData.shipping_address || '' : ''}<br/>
            ${orderData ? (orderData.shipping_city || '') + (orderData.shipping_postal_code ? ', ' + orderData.shipping_postal_code : '') : ''}<br/>
            ${orderData ? orderData.shipping_country || '' : ''}
          </div>
        </td></tr>
        <tr><td style="padding:0 48px 28px;">
          <div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:16px;">${t.track_title}</div>
          <p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0 0 16px;">${t.track_note}</p>
        </td></tr>
        <tr><td style="padding:0 48px;"><div style="height:1px;background:#e8e8e6;"></div></td></tr>
        <tr><td style="padding:36px 48px;">
          <div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:16px;">${t.care_title}</div>
          <p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0 0 16px;">${t.care_p1}</p>
          <p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0;">${t.care_p2}</p>
        </td></tr>
        <tr><td style="padding:0 48px;"><div style="height:1px;background:#e8e8e6;"></div></td></tr>
        <tr><td style="padding:32px 48px;">
          <p style="font-size:12px;letter-spacing:0.02em;color:#999;line-height:1.9;margin:0;">
            ${t.support_prefix}<a href="mailto:${SUPPORT_EMAIL}" style="color:#444;text-decoration:none;">${SUPPORT_EMAIL}</a>${t.support_suffix}
          </p>
        </td></tr>
        <tr><td style="padding:24px 48px 40px;border-top:1px solid #e8e8e6;text-align:center;">
          <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999;">&copy; ${COMPANY_LEGAL}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      try {
        if (!process.env.RESEND_API_KEY) {
          console.error('Buyer email: RESEND_API_KEY is not set');
        } else if (!emailForCustomer) {
          console.error('Buyer email: no recipient email available for order', order.id);
        } else {
          const buyerRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
            body: JSON.stringify({ from: EMAIL_FROM, to: emailForCustomer, subject: t.subject, html: emailHtml }),
          });
          if (!buyerRes.ok) console.error('Buyer email Resend error:', buyerRes.status, await buyerRes.text());
          else console.log('Confirmation email sent to:', emailForCustomer);
        }
      } catch (buyerEmailErr) { console.error('Buyer email exception:', buyerEmailErr.message); }

      // ── Admin notification (always EN) ──
      try {
        const adminItemsHtml = itemsData.map(item =>
          `<div style="font-size:13px;color:#444;line-height:1.9;">${item.name}${item.size ? ' — Size ' + item.size : ''}${item.qty > 1 ? ' × ' + item.qty : ''} — ${currencySymbol}${itemLineTotal(item)}</div>`
        ).join('');

        const adminEmailHtml = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
<tr><td style="padding:32px 48px;border-bottom:1px solid #e8e8e6;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:8px;">New Order</div>
<div style="font-size:20px;color:#0a0a0a;letter-spacing:0.02em;">${currencySymbol}${total} ${chargeCurrency}</div>
</td></tr>
<tr><td style="padding:24px 48px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Customer</div>
<div style="font-size:13px;color:#444;line-height:1.9;">${nameForCustomer}<br/>${emailForCustomer}</div>
</td></tr>
<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Items</div>
${adminItemsHtml}
</td></tr>
<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Shipping</div>
<div style="font-size:13px;color:#444;line-height:1.9;">
${orderData && orderData.shipping_name ? orderData.shipping_name + '<br/>' : ''}
${orderData ? (orderData.shipping_address || '') + '<br/>' + (orderData.shipping_city || '') + (orderData.shipping_postal_code ? ', ' + orderData.shipping_postal_code : '') + '<br/>' + (orderData.shipping_country || '') : ''}
<br/><span style="color:#999;">${pickShipping('en', shippingMethodId).name}</span>
</div>
</td></tr>
${orderData && orderData.billing_address && (orderData.billing_address !== orderData.shipping_address || orderData.billing_postal_code !== orderData.shipping_postal_code) ? `<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Billing</div>
<div style="font-size:13px;color:#444;line-height:1.9;">
${orderData.billing_name ? orderData.billing_name + '<br/>' : ''}
${(orderData.billing_address || '') + '<br/>' + (orderData.billing_city || '') + (orderData.billing_postal_code ? ', ' + orderData.billing_postal_code : '') + '<br/>' + (orderData.billing_country || '')}
</div>
</td></tr>` : ''}
<tr><td style="padding:16px 48px 24px;border-top:1px solid #e8e8e6;">
<a href="${SITE_URL}/admin.html" style="font-size:12px;letter-spacing:0.08em;color:#444;">Open Admin Panel →</a>
</td></tr>
</table></td></tr></table></body></html>`;

        const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || SUPPORT_EMAIL;
        const adminRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: EMAIL_FROM, to: adminTo,
            subject: `New order — ${currencySymbol}${total} ${chargeCurrency} from ${nameForCustomer || 'Customer'}`,
            html: adminEmailHtml,
          }),
        });
        if (!adminRes.ok) console.error('Admin email Resend error:', adminRes.status, await adminRes.text());
        else console.log('Admin notification email sent to:', adminTo);
      } catch (adminEmailErr) { console.error('Failed to send admin notification:', adminEmailErr.message); }

    } catch (err) {
      console.error('Error in webhook handler:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── payment_intent.payment_failed — operator alert (deduped) ──
  if (stripeEvent.type === 'payment_intent.payment_failed') {
    const pi = stripeEvent.data.object;
    const md = pi.metadata || {};
    const pendingOrderId = md.pending_order_id;
    const failureMessage = (pi.last_payment_error && pi.last_payment_error.message) || 'Unknown reason';
    const failureCode = (pi.last_payment_error && (pi.last_payment_error.code || pi.last_payment_error.decline_code)) || '';

    try {
      let orderRow = null;
      if (pendingOrderId) {
        const { data: row } = await supabase.from('orders').select('*, customers(*)').eq('id', pendingOrderId).single();
        orderRow = row || null;
      }
      if (orderRow && orderRow.failed_alert_sent_at) {
        return { statusCode: 200, body: JSON.stringify({ received: true, deduplicated: true }) };
      }
      if (orderRow && orderRow.status === 'paid') {
        return { statusCode: 200, body: JSON.stringify({ received: true, skipped: 'already_paid' }) };
      }

      const buyerEmail = pi.receipt_email || (orderRow && orderRow.customers && orderRow.customers.email) || '';
      const buyerName = md.customer_name || (orderRow && orderRow.customers && orderRow.customers.name) || (orderRow && orderRow.billing_name) || '';
      const chargeCurrency = (pi.currency || 'eur').toUpperCase();
      const currencySymbol = chargeCurrency === 'PLN' ? 'zł' : '€';
      const amount = (pi.amount / 100).toFixed(0);

      let itemsHtml = '';
      try {
        const parsed = md.items ? JSON.parse(md.items) : [];
        const ids = parsed.map(i => i.id).filter(Boolean);
        let nameMap = {};
        if (ids.length > 0) {
          const { data: rows } = await supabase.from('products').select('id, name').in('id', ids);
          (rows || []).forEach(p => { nameMap[p.id] = p.name; });
        }
        itemsHtml = parsed.map(i => {
          const nm = nameMap[i.id] || 'Item';
          const line = Math.round((i.price || 0) * (i.qty || 1));
          return `<div style="font-size:13px;color:#444;line-height:1.9;">${nm}${i.size ? ' — Size ' + i.size : ''}${i.qty > 1 ? ' × ' + i.qty : ''} — ${currencySymbol}${line}</div>`;
        }).join('');
      } catch (_) { /* metadata parse fallthrough */ }

      const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
<tr><td style="padding:32px 48px;border-bottom:1px solid #e8e8e6;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#b04040;margin-bottom:8px;">Payment Failed</div>
<div style="font-size:20px;color:#0a0a0a;letter-spacing:0.02em;">${currencySymbol}${amount} ${chargeCurrency}</div>
</td></tr>
<tr><td style="padding:24px 48px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Reason</div>
<div style="font-size:13px;color:#444;line-height:1.9;">${failureMessage}${failureCode ? ` <span style="color:#999;">(${failureCode})</span>` : ''}</div>
</td></tr>
<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Customer</div>
<div style="font-size:13px;color:#444;line-height:1.9;">${buyerName || '(no name)'}<br/>${buyerEmail || '(no email)'}</div>
</td></tr>
${itemsHtml ? `<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Cart</div>
${itemsHtml}
</td></tr>` : ''}
<tr><td style="padding:16px 48px 24px;border-top:1px solid #e8e8e6;">
<div style="font-size:11px;color:#999;letter-spacing:0.02em;line-height:1.7;">
Payment Intent: ${pi.id}<br/>${pendingOrderId ? 'Order: ' + pendingOrderId : 'No pending order linked'}
</div>
</td></tr>
</table></td></tr></table></body></html>`;

      const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || SUPPORT_EMAIL;
      if (!process.env.RESEND_API_KEY) {
        console.error('payment_failed alert: RESEND_API_KEY not set');
      } else {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: EMAIL_FROM, to: adminTo,
            subject: `Payment failed — ${currencySymbol}${amount} ${chargeCurrency}${buyerName ? ' — ' + buyerName : ''}`,
            html,
          }),
        });
        if (!res.ok) console.error('payment_failed alert Resend error:', res.status, await res.text());
        else console.log('payment_failed alert sent for PI:', pi.id);
      }

      if (pendingOrderId) {
        await supabase.from('orders').update({ failed_alert_sent_at: new Date().toISOString() }).eq('id', pendingOrderId);
      }
    } catch (err) {
      console.error('payment_failed handler exception:', err.message);
      // Swallow — don't 500 back to Stripe (would retry forever and spam inbox).
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
