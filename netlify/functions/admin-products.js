const { verifyAdminToken, corsHeaders, getSupabase } = require('./admin-utils');

// Fields the admin UI may write. `sizes` is the JSONB per-product size list
// ([{label,stock}, ...]); there are no fixed stock columns.
const ALLOWED = [
  'slug', 'name', 'name_pl', 'tagline', 'tagline_pl',
  'price_eur', 'price_pln', 'category', 'sizes',
  'composition', 'composition_pl', 'composition_lines', 'composition_lines_pl',
  'care', 'care_pl', 'details', 'details_pl',
  'has_back', 'extra_count', 'hs_code', 'sort_order', 'active',
];

function pickAllowed(src) {
  const out = {};
  for (const key of ALLOWED) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
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

  // GET — list all products
  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('products').select('*').order('sort_order').order('id');
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // POST — create a new product
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const id = (body.id || '').trim();
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing product id' }) };

      const row = pickAllowed(body);
      row.id = id;
      if (!row.slug) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing slug' }) };
      if (!row.name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name' }) };
      if (row.price_eur == null) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing price_eur' }) };
      if (row.sizes === undefined) row.sizes = [];

      const { data, error } = await supabase.from('products').insert(row).select().single();
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  // PATCH — update an existing product
  if (event.httpMethod === 'PATCH') {
    try {
      const { id, updates } = JSON.parse(event.body);
      if (!id || !updates) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id or updates' }) };
      }
      const safe = pickAllowed(updates);
      safe.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('products').update(safe).eq('id', id).select().single();
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  // DELETE — remove a product by id
  if (event.httpMethod === 'DELETE') {
    const id = (event.queryStringParameters || {}).id;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing product id' }) };
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers, body: JSON.stringify({ deleted: true, id }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
