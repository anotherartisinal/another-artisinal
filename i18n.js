// ── i18n (EN + PL) ──────────────────────────────────────────────────────────
// EN is canonical; PL overrides per-key and falls back to EN via t(). HTML uses
// data-i18n="key" (textContent) and data-i18n-placeholder="key" (input
// placeholder), swapped on load by applyTranslations(). Language persists under
// localStorage['aa-lang']; ?lang=pl in the URL overrides at boot.

var LANG_KEY = 'aa-lang';

var translations = {
  en: {
    // nav / global
    nav_shop: 'Shop',
    nav_about: 'About',
    nav_account: 'Account',
    nav_bag: 'Bag',
    brand: 'Another Artisanal',
    // home
    hero_title: 'Considered menswear.',
    hero_sub: 'Made to last, made in Europe.',
    hero_cta: 'View the collection',
    collection_heading: 'The collection',
    // product / detail
    add_to_bag: 'Add to bag',
    sold_out: 'Sold out',
    select_size: 'Select a size',
    size_label: 'Size',
    size_unavailable: 'Unavailable',
    composition_heading: 'Composition',
    care_heading: 'Care',
    details_heading: 'Details',
    back_to_shop: 'Back to shop',
    // bag
    bag_title: 'Your bag',
    bag_empty: 'Your bag is empty.',
    bag_remove: 'Remove',
    bag_subtotal: 'Subtotal',
    bag_note: 'Shipping calculated at checkout.',
    bag_checkout: 'Checkout',
    bag_continue: 'Continue shopping',
    // about
    about_heading: 'About',
    about_body: 'Another Artisanal makes considered menswear — jackets, trousers and knitwear built to last, produced in Europe. This is placeholder copy; replace it with the brand story.',
    // footer / newsletter
    footer_newsletter: 'Join the list',
    footer_newsletter_sub: 'New arrivals and occasional notes. No noise.',
    footer_email_placeholder: 'Email address',
    footer_subscribe: 'Subscribe',
    footer_subscribed: 'Thank you — you are on the list.',
    footer_contact: 'Contact',
    footer_legal: 'Terms & privacy',
    footer_rights: 'All rights reserved.',
    // checkout
    checkout_title: 'Checkout',
    checkout_your_details: 'Your details',
    checkout_email: 'Email',
    checkout_first_name: 'First name',
    checkout_last_name: 'Last name',
    checkout_address: 'Address',
    checkout_city: 'City',
    checkout_postal: 'Postal code',
    checkout_country: 'Country',
    checkout_phone: 'Phone',
    checkout_ship_different: 'Ship to a different address',
    checkout_recipient_details: 'Recipient details',
    checkout_shipping_method: 'Shipping',
    checkout_order_summary: 'Order summary',
    checkout_subtotal: 'Subtotal',
    checkout_shipping: 'Shipping',
    checkout_total: 'Total',
    checkout_free: 'Free',
    checkout_pay: 'Pay',
    checkout_pay_processing: 'Processing…',
    checkout_back_to_bag: 'Back to bag',
    checkout_empty: 'Your bag is empty.',
    checkout_confirm_title: 'Thank you.',
    checkout_confirm_body: 'Your order is confirmed. A confirmation email is on its way.',
    checkout_download_invoice: 'Download invoice',
    checkout_error_generic: 'Something went wrong. Please try again.',
    // shipping method labels (mirror stripe-webhook SHIPPING_LABELS)
    ship_inpost_address: 'InPost — to address',
    ship_inpost_paczkomat: 'InPost — Paczkomat',
    ship_dhl_address: 'DHL — to address',
    ship_dhl_dropoff: 'DHL — drop-off point',
    ship_eu_standard: 'Standard delivery',
    ship_eu_express: 'Express delivery',
    ship_intl_express: 'DHL Express delivery',
    // account
    account_title: 'Account',
    account_signin: 'Sign in',
    account_signin_intro: 'Enter your email and we will send you a sign-in link.',
    account_email_placeholder: 'Email address',
    account_send_link: 'Send sign-in link',
    account_link_sent: 'Check your inbox for a sign-in link.',
    account_signout: 'Sign out',
    account_orders: 'Your orders',
    account_no_orders: 'No orders yet.',
    account_saved_address: 'Saved address',
    account_save: 'Save',
    account_saved: 'Saved.',
    account_prefs: 'Preferences',
    // contact
    contact_title: 'Contact',
    contact_body: 'Questions about an order, sizing or anything else — write to us.',
    contact_email_label: 'Email',
    // misc
    currency_toggle: 'Currency',
    loading: 'Loading…',
  },
  pl: {
    nav_shop: 'Sklep',
    nav_about: 'O nas',
    nav_account: 'Konto',
    nav_bag: 'Koszyk',
    hero_title: 'Przemyślana moda męska.',
    hero_sub: 'Tworzone, by trwać. Wyprodukowane w Europie.',
    hero_cta: 'Zobacz kolekcję',
    collection_heading: 'Kolekcja',
    add_to_bag: 'Dodaj do koszyka',
    sold_out: 'Wyprzedane',
    select_size: 'Wybierz rozmiar',
    size_label: 'Rozmiar',
    size_unavailable: 'Niedostępny',
    composition_heading: 'Skład',
    care_heading: 'Pielęgnacja',
    details_heading: 'Szczegóły',
    back_to_shop: 'Wróć do sklepu',
    bag_title: 'Twój koszyk',
    bag_empty: 'Twój koszyk jest pusty.',
    bag_remove: 'Usuń',
    bag_subtotal: 'Suma częściowa',
    bag_note: 'Koszt wysyłki obliczany przy kasie.',
    bag_checkout: 'Do kasy',
    bag_continue: 'Kontynuuj zakupy',
    about_heading: 'O nas',
    about_body: 'Another Artisanal tworzy przemyślaną modę męską — kurtki, spodnie i dzianiny stworzone, by trwać, produkowane w Europie. To tekst zastępczy; zastąp go historią marki.',
    footer_newsletter: 'Zapisz się',
    footer_newsletter_sub: 'Nowości i okazjonalne wiadomości. Bez szumu.',
    footer_email_placeholder: 'Adres e-mail',
    footer_subscribe: 'Zapisz się',
    footer_subscribed: 'Dziękujemy — jesteś na liście.',
    footer_contact: 'Kontakt',
    footer_legal: 'Regulamin i prywatność',
    footer_rights: 'Wszelkie prawa zastrzeżone.',
    checkout_title: 'Kasa',
    checkout_your_details: 'Twoje dane',
    checkout_email: 'E-mail',
    checkout_first_name: 'Imię',
    checkout_last_name: 'Nazwisko',
    checkout_address: 'Adres',
    checkout_city: 'Miasto',
    checkout_postal: 'Kod pocztowy',
    checkout_country: 'Kraj',
    checkout_phone: 'Telefon',
    checkout_ship_different: 'Wyślij na inny adres',
    checkout_recipient_details: 'Dane odbiorcy',
    checkout_shipping_method: 'Wysyłka',
    checkout_order_summary: 'Podsumowanie zamówienia',
    checkout_subtotal: 'Suma częściowa',
    checkout_shipping: 'Wysyłka',
    checkout_total: 'Razem',
    checkout_free: 'Za darmo',
    checkout_pay: 'Zapłać',
    checkout_pay_processing: 'Przetwarzanie…',
    checkout_back_to_bag: 'Wróć do koszyka',
    checkout_empty: 'Twój koszyk jest pusty.',
    checkout_confirm_title: 'Dziękujemy.',
    checkout_confirm_body: 'Twoje zamówienie zostało potwierdzone. E-mail z potwierdzeniem jest w drodze.',
    checkout_download_invoice: 'Pobierz fakturę',
    checkout_error_generic: 'Coś poszło nie tak. Spróbuj ponownie.',
    ship_inpost_address: 'InPost — pod adres',
    ship_inpost_paczkomat: 'InPost — Paczkomat',
    ship_dhl_address: 'DHL — pod adres',
    ship_dhl_dropoff: 'DHL — punkt odbioru',
    ship_eu_standard: 'Dostawa standardowa',
    ship_eu_express: 'Dostawa ekspresowa',
    ship_intl_express: 'Dostawa DHL Express',
    account_title: 'Konto',
    account_signin: 'Zaloguj się',
    account_signin_intro: 'Podaj swój e-mail, a wyślemy Ci link do logowania.',
    account_email_placeholder: 'Adres e-mail',
    account_send_link: 'Wyślij link do logowania',
    account_link_sent: 'Sprawdź skrzynkę — wysłaliśmy link do logowania.',
    account_signout: 'Wyloguj się',
    account_orders: 'Twoje zamówienia',
    account_no_orders: 'Brak zamówień.',
    account_saved_address: 'Zapisany adres',
    account_save: 'Zapisz',
    account_saved: 'Zapisano.',
    account_prefs: 'Preferencje',
    contact_title: 'Kontakt',
    contact_body: 'Pytania o zamówienie, rozmiar lub cokolwiek innego — napisz do nas.',
    contact_email_label: 'E-mail',
    currency_toggle: 'Waluta',
    loading: 'Ładowanie…',
  },
};

function getLang() {
  try {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'pl') return stored;
  } catch (e) {}
  return 'en';
}

function setLang(lang) {
  if (lang !== 'en' && lang !== 'pl') return;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  applyTranslations();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
}

function t(key) {
  var lang = getLang();
  return (translations[lang] && translations[lang][key] != null)
    ? translations[lang][key]
    : (translations.en[key] != null ? translations.en[key] : key);
}

function applyTranslations(root) {
  root = root || document;
  var lang = getLang();
  if (document.documentElement) document.documentElement.setAttribute('lang', lang);
  root.querySelectorAll('[data-i18n]').forEach(function(el) {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  // reflect active state on any language toggle buttons
  root.querySelectorAll('[data-lang-btn]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-lang-btn') === lang);
  });
}

// Honor ?lang=pl|en at boot (overrides stored choice), then apply.
(function () {
  try {
    var q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'pl') localStorage.setItem(LANG_KEY, q);
  } catch (e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyTranslations(); });
  } else {
    applyTranslations();
  }
})();
