const { verifyAdminToken, corsHeaders, getSupabase } = require('./admin-utils');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  const headers = { ...corsHeaders(event), 'Content-Type': 'application/json' };

  if (!verifyAdminToken(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getSupabase();
  const params = event.queryStringParameters || {};
  const limit = Math.min(parseInt(params.limit) || 50, 200);
  const offset = parseInt(params.offset) || 0;

  // Single customer with orders
  if (params.id) {
    const { data: customer, error: custErr } = await supabase
      .from('customers').select('*').eq('id', params.id).single();
    if (custErr) return { statusCode: 500, headers, body: JSON.stringify({ error: custErr.message }) };

    const { data: orders, error: ordErr } = await supabase
      .from('orders').select('*, order_items(*)').eq('customer_id', params.id)
      .order('created_at', { ascending: false });
    if (ordErr) return { statusCode: 500, headers, body: JSON.stringify({ error: ordErr.message }) };

    return { statusCode: 200, headers, body: JSON.stringify({ customer, orders }) };
  }

  // List customers
  let query = supabase
    .from('customers')
    .select('*, orders(id)', { count: 'exact' })
    .order('name')
    .range(offset, offset + limit - 1);

  if (params.search) {
    // Sanitize before interpolating into the PostgREST .or() filter grammar
    // (commas/parens are structural; strip them + wildcards + backslash).
    var term = String(params.search).replace(/[,()\\*]/g, '').trim();
    if (term) query = query.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

  const customers = (data || []).map(c => ({
    id: c.id, name: c.name, email: c.email, country: c.country,
    order_count: c.orders ? c.orders.length : 0,
  }));

  return { statusCode: 200, headers, body: JSON.stringify({ customers, total: count }) };
};
