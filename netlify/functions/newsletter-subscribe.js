const { createClient } = require('@supabase/supabase-js');
const { corsHeaders } = require('./admin-utils');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event, 'POST, OPTIONS'), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(event, 'POST, OPTIONS'), body: 'Method Not Allowed' };
  }

  const headers = { ...corsHeaders(event, 'POST, OPTIONS'), 'Content-Type': 'application/json' };

  try {
    const { email } = JSON.parse(event.body);
    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() }, { onConflict: 'email' });

    if (error) {
      console.error('Newsletter subscribe error:', error.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not subscribe' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad request' }) };
  }
};
