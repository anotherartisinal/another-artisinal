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
    shop_view_all: 'View all',
    shop_clear: 'Clear ×',
    shop_empty: 'Nothing here yet.',
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
    bag_view: 'View bag',
    bag_added: 'Added to bag',
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
    footer_legal: 'Legal',
    footer_help: 'Help',
    footer_instagram: 'Instagram',
    footer_tiktok: 'TikTok',
    footer_shipping: 'Shipping',
    // Shipping & returns page
    shipping_title: 'Shipping & Returns',
    shipping_intro: 'How orders are packed, sent and returned.',
    shipping_packaging_label: 'Packaging',
    shipping_packaging_p: 'Every order is packed flat in unbleached tissue inside a plain recycled carton. No plastic, no filler, nothing printed on the outside — the packaging is designed to be reused or composted.',
    shipping_label: 'Shipping',
    shipping_p: 'Orders ship from Poland worldwide, dispatched within 1–2 business days. EU delivery takes 2–5 business days; the rest of the world 5–10. Shipping is calculated at checkout by destination. Any import duties or tariffs outside the EU are the responsibility of the recipient and are paid directly to the carrier.',
    returns_label: 'Returns',
    returns_p1: 'We accept returns within 14 days of delivery. Items must be unworn, in their original condition, and in the original packaging with all tags attached.',
    returns_p2: 'Return shipping is arranged and paid by the customer unless the item is faulty or was sent in error. This does not affect your statutory rights.',
    returns_p3_prefix: 'To start a return, write to us at',
    returns_p3: 'before sending anything back, and include your order number.',
    returns_p4: 'Refunds are issued to the original payment method within 5–10 business days of the return arriving with us.',
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
    nav_manifesto: 'Manifesto',
    nav_subscribe: 'Subscribe',
    nav_login: 'Log in',
    nav_cart: 'Cart',
    nav_visuals: 'Visuals',
    shop_objects: 'objects',
    manifesto_intro: 'A short introduction to the principles behind the work — replace with the real manifesto copy. Placeholder text.',
    manifesto_close: 'Placeholder closing line.',
    pdp_size: 'Size',
    pdp_description: 'Description',
    pdp_tag: 'Tag',
    add_to_cart: 'Add to cart',
    added: 'Added',
    subscribe_heading: 'Subscribe',
    subscribe_sub: 'New arrivals and occasional notes. No noise.',
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
    shop_view_all: 'Zobacz wszystko',
    shop_clear: 'Wyczyść ×',
    shop_empty: 'Nic tu jeszcze nie ma.',
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
    bag_view: 'Zobacz koszyk',
    bag_added: 'Dodano do koszyka',
    about_heading: 'O nas',
    about_body: 'Another Artisanal tworzy przemyślaną modę męską — kurtki, spodnie i dzianiny stworzone, by trwać, produkowane w Europie. To tekst zastępczy; zastąp go historią marki.',
    footer_newsletter: 'Zapisz się',
    footer_newsletter_sub: 'Nowości i okazjonalne wiadomości. Bez szumu.',
    footer_email_placeholder: 'Adres e-mail',
    footer_subscribe: 'Zapisz się',
    footer_subscribed: 'Dziękujemy — jesteś na liście.',
    footer_contact: 'Kontakt',
    footer_legal: 'Informacje prawne',
    footer_help: 'Pomoc',
    footer_instagram: 'Instagram',
    footer_tiktok: 'TikTok',
    footer_shipping: 'Wysyłka',
    // Strona wysyłki i zwrotów
    shipping_title: 'Wysyłka i zwroty',
    shipping_intro: 'Jak pakujemy, wysyłamy i przyjmujemy zwroty.',
    shipping_packaging_label: 'Opakowanie',
    shipping_packaging_p: 'Każde zamówienie pakujemy na płasko w niebieloną bibułę, w prostym kartonie z recyklingu. Bez plastiku, bez wypełniaczy, bez nadruków na zewnątrz — opakowanie ma nadawać się do ponownego użycia lub kompostowania.',
    shipping_label: 'Wysyłka',
    shipping_p: 'Wysyłamy z Polski na cały świat, w ciągu 1–2 dni roboczych. Dostawa na terenie UE trwa 2–5 dni roboczych, poza UE 5–10. Koszt wysyłki obliczany jest przy kasie w zależności od kraju dostawy. Cła i podatki importowe poza UE pokrywa odbiorca i opłaca je bezpośrednio przewoźnikowi.',
    returns_label: 'Zwroty',
    returns_p1: 'Przyjmujemy zwroty w ciągu 14 dni od dostawy. Produkty muszą być nienoszone, w stanie nienaruszonym, w oryginalnym opakowaniu i z metkami.',
    returns_p2: 'Koszt przesyłki zwrotnej organizuje i pokrywa klient, chyba że produkt jest wadliwy lub został wysłany błędnie. Nie narusza to Twoich praw ustawowych.',
    returns_p3_prefix: 'Aby rozpocząć zwrot, napisz do nas na',
    returns_p3: 'przed odesłaniem przesyłki i podaj numer zamówienia.',
    returns_p4: 'Zwrot środków realizujemy na pierwotną metodę płatności w ciągu 5–10 dni roboczych od otrzymania przesyłki.',
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
    nav_manifesto: 'Manifest',
    nav_subscribe: 'Zapisz się',
    nav_login: 'Zaloguj się',
    nav_cart: 'Koszyk',
    nav_visuals: 'Wizualizacje',
    shop_objects: 'produktów',
    manifesto_intro: 'Krótkie wprowadzenie do zasad stojących za marką — zastąp prawdziwym tekstem manifestu. Tekst zastępczy.',
    manifesto_close: 'Zastępcza linia zamykająca.',
    pdp_size: 'Rozmiar',
    pdp_description: 'Opis',
    pdp_tag: 'Metka',
    add_to_cart: 'Dodaj do koszyka',
    added: 'Dodano',
    subscribe_heading: 'Zapisz się',
    subscribe_sub: 'Nowości i okazjonalne wiadomości. Bez szumu.',
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
