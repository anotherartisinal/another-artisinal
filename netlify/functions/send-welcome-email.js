const { corsHeaders, BRAND, SITE_URL, EMAIL_FROM, SUPPORT_EMAIL, COMPANY_LEGAL, LOGO_URL } = require('./admin-utils');

// Resolve the caller from a Supabase Auth Bearer token. The recipient address
// and display name come from this response, never the request body — the body
// is trusted only for the lang hint.
async function getAuthUser(event) {
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const res = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
    headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) return null;
  return await res.json();
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

// Lang-aware welcome-email copy. EN canonical; PL overrides + falls back to EN.
const EMAIL_I18N = {
  en: {
    subject: `Welcome to ${BRAND}`,
    page_title: `Welcome to ${BRAND}`,
    greeting: function(firstName) { return 'Welcome' + (firstName ? ', ' + firstName : '') + '.'; },
    body: 'Your account has been created. You can now track your orders, save your address, and manage your preferences.',
    explore_prefix: 'Explore the collection at ',
    explore_suffix: '.',
    support_html: `Questions? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;text-decoration:none;">${SUPPORT_EMAIL}</a>.`,
    footer: `&copy; ${COMPANY_LEGAL}`,
  },
  pl: {
    subject: `Witamy w ${BRAND}`,
    page_title: `Witamy w ${BRAND}`,
    greeting: function(firstName) { return 'Witaj' + (firstName ? ', ' + firstName : '') + '.'; },
    body: 'Twoje konto zostało utworzone. Możesz teraz śledzić swoje zamówienia, zapisywać adres i zarządzać preferencjami.',
    explore_prefix: 'Odkryj kolekcję na ',
    support_html: `Masz pytania? Napisz do nas na <a href="mailto:${SUPPORT_EMAIL}" style="color:#444;text-decoration:none;">${SUPPORT_EMAIL}</a>.`,
  },
};
function pickEmailLang(lang) {
  return Object.assign({}, EMAIL_I18N.en, EMAIL_I18N[lang] || {});
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event, 'POST, OPTIONS'), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(event, 'POST, OPTIONS'), body: 'Method Not Allowed' };
  }

  const headers = { ...corsHeaders(event, 'POST, OPTIONS'), 'Content-Type': 'application/json' };

  try {
    const user = await getAuthUser(event);
    if (!user || !user.email) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    let lang;
    try { ({ lang } = JSON.parse(event.body || '{}')); } catch { lang = null; }

    const email = user.email;
    const fullName = (user.user_metadata && user.user_metadata.full_name) || '';
    const firstName = escHtml(fullName.split(' ')[0] || '');
    const safeLang = (lang === 'pl') ? 'pl' : 'en';
    const t = pickEmailLang(safeLang);

    const emailHtml = '<!DOCTYPE html><html lang="' + safeLang + '"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>' + t.page_title + '</title></head>' +
      '<body style="margin:0;padding:0;background:#f8f8f6;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">' +
      '<tr><td style="padding:40px 48px 32px;border-bottom:1px solid #e8e8e6;text-align:center;background:#ffffff;">' +
      '<img src="' + LOGO_URL + '" alt="' + BRAND + '" style="height:28px;width:auto;display:block;margin:0 auto;"/></td></tr>' +
      '<tr><td style="padding:36px 48px 28px;">' +
      '<p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0 0 20px;">' + t.greeting(firstName) + '</p>' +
      '<p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0 0 20px;">' + t.body + '</p>' +
      '<p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0;">' +
      t.explore_prefix + '<a href="' + SITE_URL + '" style="color:#444;text-decoration:none;border-bottom:1px solid #e8e8e6;">' + SITE_HOST + '</a>' + t.explore_suffix + '</p></td></tr>' +
      '<tr><td style="padding:0 48px;"><div style="height:1px;background:#e8e8e6;"></div></td></tr>' +
      '<tr><td style="padding:32px 48px;">' +
      '<p style="font-size:12px;letter-spacing:0.02em;color:#999;line-height:1.9;margin:0;">' + t.support_html + '</p></td></tr>' +
      '<tr><td style="padding:24px 48px 40px;border-top:1px solid #e8e8e6;text-align:center;">' +
      '<div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999;">' + t.footer + '</div></td></tr>' +
      '</table></td></tr></table></body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: EMAIL_FROM, to: email, subject: t.subject, html: emailHtml }),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Welcome email error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send' }) };
  }
};
