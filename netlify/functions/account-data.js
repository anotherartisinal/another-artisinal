const { createClient } = require('@supabase/supabase-js');
const { corsHeaders } = require('./admin-utils');

async function getAuthUser(event) {
  var token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  var res = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) return null;
  return await res.json();
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event, 'GET, POST, OPTIONS'), body: '' };
  }

  var headers = { ...corsHeaders(event, 'GET, POST, OPTIONS'), 'Content-Type': 'application/json' };

  var user = await getAuthUser(event);
  if (!user || !user.email) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // GET — saved addresses + preferences + hidden orders
  if (event.httpMethod === 'GET') {
    var { data, error } = await supabase
      .from('customers')
      .select('address_first_name, address_last_name, address_line, address_city, address_postal, address_country, addresses, hidden_order_ids, pref_collections, pref_orders, pref_editorial, pref_lang')
      .eq('email', user.email)
      .single();

    if (error || !data) {
      return { statusCode: 200, headers, body: JSON.stringify({ address: null, addresses: [], hidden_order_ids: [], prefs: null }) };
    }

    var addresses = Array.isArray(data.addresses) ? data.addresses : [];
    if (addresses.length === 0 && data.address_line) {
      addresses = [{
        id: 'legacy', label: '',
        first_name: data.address_first_name || '', last_name: data.address_last_name || '',
        address: data.address_line || '', city: data.address_city || '',
        postal: data.address_postal || '', country: data.address_country || '',
      }];
    }
    var defaultAddr = addresses[0] || null;

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        address: defaultAddr,
        addresses: addresses,
        hidden_order_ids: Array.isArray(data.hidden_order_ids) ? data.hidden_order_ids : [],
        prefs: {
          collections: data.pref_collections || false,
          orders: data.pref_orders !== false,
          editorial: data.pref_editorial || false,
          lang: data.pref_lang || 'en',
        },
      }),
    };
  }

  // POST — save address + preferences
  if (event.httpMethod === 'POST') {
    try {
      var body = JSON.parse(event.body);
      var updates = {};

      if (body.address) {
        updates.address_first_name = body.address.first_name || '';
        updates.address_last_name = body.address.last_name || '';
        updates.address_line = body.address.address || '';
        updates.address_city = body.address.city || '';
        updates.address_postal = body.address.postal || '';
        updates.address_country = body.address.country || '';
      }

      if (Array.isArray(body.addresses)) {
        updates.addresses = body.addresses;
        var def = body.addresses[0];
        if (def) {
          updates.address_first_name = def.first_name || '';
          updates.address_last_name = def.last_name || '';
          updates.address_line = def.address || '';
          updates.address_city = def.city || '';
          updates.address_postal = def.postal || '';
          updates.address_country = def.country || '';
        } else {
          updates.address_first_name = '';
          updates.address_last_name = '';
          updates.address_line = '';
          updates.address_city = '';
          updates.address_postal = '';
          updates.address_country = '';
        }
      }

      if (Array.isArray(body.hidden_order_ids)) {
        updates.hidden_order_ids = body.hidden_order_ids;
      }

      if (body.prefs) {
        if (body.prefs.collections !== undefined) updates.pref_collections = body.prefs.collections;
        if (body.prefs.orders !== undefined) updates.pref_orders = body.prefs.orders;
        if (body.prefs.editorial !== undefined) updates.pref_editorial = body.prefs.editorial;
        if (body.prefs.lang !== undefined && ['en', 'pl'].indexOf(body.prefs.lang) !== -1) {
          updates.pref_lang = body.prefs.lang;
        }
      }

      if (Object.keys(updates).length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No data provided' }) };
      }

      var { error } = await supabase.from('customers').update(updates).eq('email', user.email);
      if (error) {
        console.error('Account data update error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Update failed' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};
