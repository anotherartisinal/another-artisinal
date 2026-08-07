// Scheduled function — fires hourly (see netlify.toml [functions."abandoned-cart-alert"]).
// Picks orders.status='pending' rows created 1h–25h ago that haven't been
// alerted yet (abandoned_alert_sent_at IS NULL), emails the operator one message
// per order, and stamps the timestamp so a row never alerts twice. The 25h tail
// keeps the inbox quiet if the scheduler was paused. Service role bypasses RLS.

const { createClient } = require('@supabase/supabase-js');
const { EMAIL_FROM, SUPPORT_EMAIL } = require('./admin-utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SHIPPING_LABEL = {
  inpost_address:   'InPost — to address',
  inpost_paczkomat: 'InPost — Paczkomat',
  dhl_address:      'DHL — to address',
  dhl_dropoff:      'DHL — drop-off point',
  eu_standard:      'Standard delivery',
  eu_express:       'Express delivery',
  intl_express:     'DHL Express delivery',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendAlertForOrder(order) {
  const customer = order.customers || {};
  const items = order.order_items || [];
  const currency = (order.currency || 'EUR').toUpperCase();
  const symbol = currency === 'PLN' ? 'zł' : '€';
  const total = Number(order.total || 0).toFixed(0);
  const shippingLabel = SHIPPING_LABEL[order.shipping_method] || (order.shipping_method || 'Unknown');

  const itemsHtml = items.map(it => {
    const line = Math.round(Number(it.price || 0) * Number(it.quantity || 1));
    return `<div style="font-size:13px;color:#444;line-height:1.9;">${esc(it.product_name)}${it.size ? ' — Size ' + esc(it.size) : ''}${it.quantity > 1 ? ' × ' + it.quantity : ''} — ${symbol}${line}</div>`;
  }).join('') || '<div style="font-size:13px;color:#999;">(no items recorded)</div>';

  const ageMin = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const ageStr = ageMin >= 60 ? `${Math.floor(ageMin / 60)}h ${ageMin % 60}m` : `${ageMin}m`;

  const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
<tr><td style="padding:32px 48px;border-bottom:1px solid #e8e8e6;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:8px;">Abandoned Cart</div>
<div style="font-size:20px;color:#0a0a0a;letter-spacing:0.02em;">${symbol}${esc(total)} ${esc(currency)}</div>
<div style="font-size:11px;color:#999;letter-spacing:0.02em;margin-top:6px;">Pending for ${esc(ageStr)}</div>
</td></tr>
<tr><td style="padding:24px 48px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Customer</div>
<div style="font-size:13px;color:#444;line-height:1.9;">${esc(customer.name || order.billing_name || '(no name)')}<br/>${esc(customer.email || '(no email)')}</div>
</td></tr>
<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Cart</div>
${itemsHtml}
</td></tr>
<tr><td style="padding:0 48px 24px;">
<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Intended shipping</div>
<div style="font-size:13px;color:#444;line-height:1.9;">
${esc(order.shipping_name || '')}<br/>
${esc(order.shipping_address || '')}<br/>
${esc(order.shipping_city || '')}${order.shipping_postal_code ? ', ' + esc(order.shipping_postal_code) : ''}<br/>
${esc(order.shipping_country || '')}
<br/><span style="color:#999;">${esc(shippingLabel)}</span>
</div>
</td></tr>
<tr><td style="padding:16px 48px 24px;border-top:1px solid #e8e8e6;">
<div style="font-size:11px;color:#999;letter-spacing:0.02em;line-height:1.7;">Order: ${esc(order.id)}<br/>Created: ${esc(order.created_at)}</div>
</td></tr>
</table></td></tr></table></body></html>`;

  const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || SUPPORT_EMAIL;
  if (!process.env.RESEND_API_KEY) {
    console.error('abandoned-cart: RESEND_API_KEY not set');
    return false;
  }

  const subjectName = customer.name || order.billing_name || customer.email || 'guest';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: EMAIL_FROM, to: adminTo,
      subject: `Abandoned cart — ${symbol}${total} ${currency} — ${subjectName}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error('abandoned-cart Resend error:', res.status, await res.text());
    return false;
  }
  return true;
}

exports.handler = async function() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customers(name, email, country), order_items(product_name, size, quantity, price)')
      .eq('status', 'pending')
      .is('abandoned_alert_sent_at', null)
      .lt('created_at', oneHourAgo)
      .gt('created_at', twentyFiveHoursAgo)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      console.log('abandoned-cart: no candidates');
      return { statusCode: 200, body: JSON.stringify({ alerted: 0 }) };
    }

    let alerted = 0;
    for (const order of orders) {
      try {
        const ok = await sendAlertForOrder(order);
        if (ok) {
          await supabase.from('orders').update({ abandoned_alert_sent_at: new Date().toISOString() }).eq('id', order.id);
          alerted += 1;
        }
      } catch (e) {
        console.error('abandoned-cart per-order error:', order.id, e.message);
      }
    }

    console.log(`abandoned-cart: alerted ${alerted} of ${orders.length}`);
    return { statusCode: 200, body: JSON.stringify({ alerted, scanned: orders.length }) };
  } catch (err) {
    console.error('abandoned-cart fatal:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
