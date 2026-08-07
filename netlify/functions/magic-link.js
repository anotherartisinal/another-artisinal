const { createClient } = require('@supabase/supabase-js');
const { corsHeaders, BRAND, SITE_URL, EMAIL_FROM, SUPPORT_EMAIL, COMPANY_LEGAL, LOGO_URL } = require('./admin-utils');

const REDIRECT_TO = `${SITE_URL}/account.html`;

// Lang-aware magic-link email copy. EN canonical; PL overrides per-string and
// falls back to EN where missing.
const EMAIL_I18N = {
  en: {
    subject: `Your ${BRAND} sign-in link`,
    page_title: 'Your sign-in link',
    body: `Click the link below to sign in to your ${BRAND} account. The link expires in 60 minutes.`,
    cta: 'Sign in',
    ignore_note: "Didn't request this link? You can safely ignore this email.",
    support_prefix: 'Questions? Reach us at ',
    footer: `&copy; ${COMPANY_LEGAL}`,
  },
  pl: {
    subject: `Twój link do logowania — ${BRAND}`,
    page_title: 'Twój link do logowania',
    body: `Kliknij poniższy link, aby zalogować się do swojego konta ${BRAND}. Link wygasa po 60 minutach.`,
    cta: 'Zaloguj się',
    ignore_note: 'Jeśli nie prosisz o ten link, możesz spokojnie zignorować tę wiadomość.',
    support_prefix: 'Masz pytania? Napisz do nas na ',
  },
};
function pickEmailLang(lang) {
  return Object.assign({}, EMAIL_I18N.en, EMAIL_I18N[lang] || {});
}

function buildEmailHtml(actionLink, lang) {
  const t = pickEmailLang(lang);
  return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>' + t.page_title + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f8f8f6;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f6;padding:40px 20px;"><tr><td align="center">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">' +
    '<tr><td style="padding:40px 48px 32px;border-bottom:1px solid #e8e8e6;text-align:center;background:#ffffff;">' +
    '<img src="' + LOGO_URL + '" alt="' + BRAND + '" style="height:28px;width:auto;display:block;margin:0 auto;"/></td></tr>' +
    '<tr><td style="padding:36px 48px 12px;">' +
    '<p style="font-size:13px;letter-spacing:0.02em;color:#444;line-height:1.9;margin:0 0 24px;">' + t.body + '</p>' +
    '<p style="margin:0 0 28px;text-align:center;">' +
    '<a href="' + actionLink + '" style="display:inline-block;padding:14px 36px;background:#000;color:#fff;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;text-decoration:none;">' + t.cta + '</a></p>' +
    '<p style="font-size:11px;letter-spacing:0.02em;color:#999;line-height:1.8;margin:0 0 8px;word-break:break-all;">' +
    '<a href="' + actionLink + '" style="color:#999;text-decoration:underline;">' + actionLink + '</a></p>' +
    '<p style="font-size:11px;letter-spacing:0.02em;color:#999;line-height:1.8;margin:24px 0 0;">' + t.ignore_note + '</p></td></tr>' +
    '<tr><td style="padding:0 48px;"><div style="height:1px;background:#e8e8e6;"></div></td></tr>' +
    '<tr><td style="padding:32px 48px;">' +
    '<p style="font-size:12px;letter-spacing:0.02em;color:#999;line-height:1.9;margin:0;">' +
    t.support_prefix + '<a href="mailto:' + SUPPORT_EMAIL + '" style="color:#444;text-decoration:none;">' + SUPPORT_EMAIL + '</a>.</p></td></tr>' +
    '<tr><td style="padding:24px 48px 40px;border-top:1px solid #e8e8e6;text-align:center;">' +
    '<div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999;">' + t.footer + '</div></td></tr>' +
    '</table></td></tr></table></body></html>';
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
    const { email, lang } = JSON.parse(event.body || '{}');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: REDIRECT_TO },
    });

    if (error) {
      console.error('generateLink error:', error.message);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }; // don't leak existence
    }

    const actionLink = data && data.properties && data.properties.action_link;
    if (!actionLink) {
      console.error('generateLink returned no action_link');
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const safeLang = (lang === 'pl') ? 'pl' : 'en';
    const t = pickEmailLang(safeLang);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: EMAIL_FROM, to: email, subject: t.subject, html: buildEmailHtml(actionLink, safeLang) }),
    });

    if (!resendRes.ok) {
      console.error('Resend send failed:', resendRes.status, await resendRes.text());
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('magic-link error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
