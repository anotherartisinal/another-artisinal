const { verifyAdminToken, corsHeaders, getSupabase, BRAND, EMAIL_FROM, SUPPORT_EMAIL, COMPANY_LEGAL, LOGO_URL } = require('./admin-utils');

// Escape customer-supplied values before interpolating into email HTML.
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sendShippingEmail(order) {
  const customer = order.customers;
  if (!customer || !customer.email) return;

  const items = order.order_items || [];
  const firstName = (customer.name || '').split(' ')[0] || '';
  const trackingNumber = order.tracking_number || '';

  const itemsHtml = items.map(function(item) {
    return '<div style="font-size:13px;color:#444;letter-spacing:0.02em;line-height:1.9;">' +
      escHtml(item.product_name) + (item.size ? ' &mdash; Size ' + escHtml(item.size) : '') +
      (item.quantity > 1 ? ' &times; ' + item.quantity : '') + '</div>';
  }).join('');

  const emailHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Your order has shipped</title></head>' +
    '<body style="margin:0;padding:0;background:#f8f8f6;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">' +
    '<tr><td style="padding:40px 48px 32px;border-bottom:1px solid #e8e8e6;text-align:center;background:#ffffff;">' +
    '<img src="' + LOGO_URL + '" alt="' + BRAND + '" style="height:28px;width:auto;display:block;margin:0 auto;"/></td></tr>' +
    '<tr><td style="padding:36px 48px 28px;">' +
    '<p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0;">' +
    'Your order is on its way' + (firstName ? ', ' + escHtml(firstName) : '') + '. It has been carefully packed and dispatched.</p></td></tr>' +
    (trackingNumber ? '<tr><td style="padding:0 48px 28px;">' +
    '<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:16px;">Tracking number</div>' +
    '<div style="font-size:15px;letter-spacing:0.08em;color:#0a0a0a;font-family:monospace;padding:16px 20px;background:#f8f8f6;text-align:center;">' + escHtml(trackingNumber) + '</div></td></tr>' : '') +
    '<tr><td style="padding:0 48px 28px;">' +
    '<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:16px;">Items shipped</div>' +
    itemsHtml + '</td></tr>' +
    '<tr><td style="padding:0 48px 28px;">' +
    '<div style="font-size:9px;letter-spacing:0.35em;text-transform:uppercase;color:#999;margin-bottom:12px;">Delivering to</div>' +
    '<div style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;">' +
    escHtml(order.shipping_name || customer.name || '') + '<br/>' +
    escHtml(order.shipping_address || '') + '<br/>' +
    escHtml(order.shipping_city || '') + (order.shipping_postal_code ? ', ' + escHtml(order.shipping_postal_code) : '') + '<br/>' +
    escHtml(order.shipping_country || customer.country || '') + '</div></td></tr>' +
    '<tr><td style="padding:0 48px;"><div style="height:1px;background:#e8e8e6;"></div></td></tr>' +
    '<tr><td style="padding:32px 48px;">' +
    '<p style="font-size:12px;letter-spacing:0.02em;color:#999;line-height:1.9;margin:0;">' +
    'If you have any questions, contact us at <a href="mailto:' + SUPPORT_EMAIL + '" style="color:#444;text-decoration:none;">' + SUPPORT_EMAIL + '</a>.</p></td></tr>' +
    '<tr><td style="padding:24px 48px 40px;border-top:1px solid #e8e8e6;text-align:center;">' +
    '<div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999;">&copy; ' + COMPANY_LEGAL + '</div></td></tr>' +
    '</table></td></tr></table></body></html>';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
    body: JSON.stringify({ from: EMAIL_FROM, to: customer.email, subject: `Your ${BRAND} order has shipped`, html: emailHtml }),
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  const headers = { ...corsHeaders(event), 'Content-Type': 'application/json' };

  if (!verifyAdminToken(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = getSupabase();
  const params = event.queryStringParameters || {};

  // GET — list orders
  if (event.httpMethod === 'GET') {
    const limit = Math.min(parseInt(params.limit) || 50, 200);
    const offset = parseInt(params.offset) || 0;

    let query = supabase
      .from('orders')
      .select('*, customers(id, name, email, country), order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.status) query = query.eq('status', params.status);

    const { data, error, count } = await query;
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ orders: data, total: count }) };
  }

  // PATCH — update status / tracking
  if (event.httpMethod === 'PATCH') {
    try {
      const { id, status, tracking_number } = JSON.parse(event.body);
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order id' }) };

      const updates = {};
      if (status) {
        const valid = ['pending', 'paid', 'confirmed', 'shipped', 'delivered'];
        if (!valid.includes(status)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid status' }) };
        }
        updates.status = status;
      }
      if (tracking_number !== undefined) updates.tracking_number = tracking_number;

      if (Object.keys(updates).length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No updates provided' }) };
      }

      const { data, error } = await supabase
        .from('orders').update(updates).eq('id', id)
        .select('*, customers(id, name, email, country), order_items(*)').single();
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

      if (updates.status === 'shipped' || (updates.tracking_number && data.status === 'shipped')) {
        try {
          await sendShippingEmail(data);
          console.log('Shipping email sent to:', data.customers && data.customers.email);
        } catch (emailErr) { console.error('Failed to send shipping email:', emailErr.message); }
      }

      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  // DELETE — remove an abandoned pending order (pending status only).
  if (event.httpMethod === 'DELETE') {
    const id = params.id;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order id' }) };

    const { data: existing, error: lookupError } = await supabase
      .from('orders').select('id, status').eq('id', id).single();
    if (lookupError) return { statusCode: 500, headers, body: JSON.stringify({ error: lookupError.message }) };
    if (!existing) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
    if (existing.status !== 'pending') {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Only pending orders can be deleted. This order is ' + existing.status + '.' }) };
    }

    const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', id);
    if (itemsError) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete order items: ' + itemsError.message }) };
    const { error: orderError } = await supabase.from('orders').delete().eq('id', id);
    if (orderError) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete order: ' + orderError.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ deleted: true, id: id }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
