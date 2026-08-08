// ── Another Artisanal — front-end app (editorial smooth-scroll build) ────────
// Surfaces: visuals(home) · shop · manifesto · product detail · bag · subscribe.
// Cart drawer + sticky bar. Lenis-aware routing. Safe to include on any page.

(function () {
  'use strict';

  var CART_KEY = 'aa-cart';
  var CURRENCY_KEY = 'aa-currency';

  // ── Currency ──
  function getCurrency() {
    try { var c = localStorage.getItem(CURRENCY_KEY); if (c === 'eur' || c === 'pln') return c; } catch (e) {}
    return 'eur';
  }
  function setCurrency(c) {
    if (c !== 'eur' && c !== 'pln') return;
    try { localStorage.setItem(CURRENCY_KEY, c); } catch (e) {}
    document.dispatchEvent(new CustomEvent('currencychange'));
  }
  function formatMoney(num, currency) {
    currency = currency || getCurrency();
    var n = Number(num) || 0;
    var s = (Math.round(n * 100) % 100 === 0) ? String(Math.round(n)) : n.toFixed(2);
    return currency === 'pln' ? (s + ' zł') : ('€' + s);
  }
  function unitPrice(item, currency) {
    currency = currency || getCurrency();
    return currency === 'pln' ? (item.pricePlnNum != null ? item.pricePlnNum : item.priceNum) : item.priceNum;
  }
  function productPrice(p) { return getCurrency() === 'pln' ? p.pricePlnNum : p.priceNum; }

  // ── Cart ──
  function getCart() { try { var c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; } catch (e) { return []; } }
  function saveCart(cart) { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} document.dispatchEvent(new CustomEvent('cartchange')); }
  function cartCount() { return getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0); }
  function cartSubtotal(cur) { return getCart().reduce(function (s, i) { return s + unitPrice(i, cur) * (i.qty || 1); }, 0); }
  function addToCart(product, size) {
    var cart = getCart();
    var ex = cart.find(function (i) { return i.id === product.id && i.size === size; });
    if (ex) ex.qty = (ex.qty || 1) + 1;
    else cart.push({ id: product.id, slug: product.slug, name: product.name, size: size, priceNum: product.priceNum, pricePlnNum: product.pricePlnNum, qty: 1 });
    saveCart(cart);
  }
  function removeFromCart(i) { var cart = getCart(); cart.splice(i, 1); saveCart(cart); }

  // ── localized fields / helpers ──
  function pField(p, base) { var lang = (typeof getLang === 'function') ? getLang() : 'en'; return (lang === 'pl' && p[base + 'Pl']) ? p[base + 'Pl'] : p[base]; }
  function pName(p) { return pField(p, 'name'); }
  function imgPath(id, view) { return '/images/' + id + '-' + view + '.jpg'; }
  function totalStock(p) { return (p.sizes || []).reduce(function (s, x) { return s + (x.stock || 0); }, 0); }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function setHtml(id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; }
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function resize() { if (typeof window.lenisResize === 'function') window.lenisResize(); }

  // ── Header / sticky bar ──
  function updateHeader() {
    var count = cartCount();
    document.querySelectorAll('[data-bag-count]').forEach(function (el) { el.textContent = '(' + count + ')'; });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-currency-btn') === getCurrency()); });
    document.querySelectorAll('[data-lang-btn]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-lang-btn') === (typeof getLang === 'function' ? getLang() : 'en')); });
    var bar = document.getElementById('sticky-bag-bar');
    if (bar) { bar.classList.toggle('visible', count > 0); document.body.classList.toggle('has-sticky-bar', count > 0); }
  }
  function wireGlobalToggles() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (el) { el.addEventListener('click', function () { if (typeof setLang === 'function') setLang(el.getAttribute('data-lang-btn')); }); });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) { el.addEventListener('click', function () { setCurrency(el.getAttribute('data-currency-btn')); }); });
  }

  // ── Newsletter ──
  function wireNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var status = document.getElementById('newsletter-status');
      var email = input && input.value.trim();
      if (!email) return;
      fetch('/.netlify/functions/newsletter-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
        .then(function (r) { return r.json(); }).then(function () { if (status) status.textContent = t('footer_subscribed'); input.value = ''; })
        .catch(function () { if (status) status.textContent = t('checkout_error_generic'); });
    });
  }

  // ── Shop taxonomy (single source of truth for the mega-menu + filter labels) ──
  // Both dimensions are multi-valued: a product carries arrays of category and
  // material slugs, so it can appear under several filters at once.
  var TAXONOMY = {
    category: [
      { slug: 'coats-jackets',  en: 'Coats Jackets',  pl: 'Płaszcze Kurtki' },
      { slug: 'vests',          en: 'Vests',          pl: 'Kamizelki' },
      { slug: 'shirts',         en: 'Shirts',         pl: 'Koszule' },
      { slug: 'pants',          en: 'Pants',          pl: 'Spodnie' },
      { slug: 'dresses-skirts', en: 'Dresses Skirts', pl: 'Sukienki Spódnice' },
      { slug: 'jerseys',        en: 'Jerseys',        pl: 'Swetry' },
      { slug: 'accessories',    en: 'Accessories',    pl: 'Akcesoria' },
      { slug: 'bags',           en: 'Bags',           pl: 'Torby' },
      { slug: 'masks',          en: 'Masks',          pl: 'Maski' },
    ],
    material: [
      { slug: 'cotton', en: 'Cotton', pl: 'Bawełna' },
      { slug: 'linen',  en: 'Linen',  pl: 'Len' },
      { slug: 'hemp',   en: 'Hemp',   pl: 'Konopie' },
      { slug: 'blends', en: 'Blends', pl: 'Mieszanki' },
      { slug: 'wool',   en: 'Wool',   pl: 'Wełna' },
      { slug: 'silk',   en: 'Silk',   pl: 'Jedwab' },
    ],
  };
  function taxLabel(type, slug) {
    var lang = (typeof getLang === 'function') ? getLang() : 'en';
    var list = TAXONOMY[type] || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i][lang] || list[i].en;
    return slug;
  }
  function isTaxSlug(type, slug) {
    var list = TAXONOMY[type] || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return true;
    return false;
  }

  // Active shop filter: null (all) or { type: 'category'|'material', value: <slug> }.
  var _filter = null;
  function productTags(p, type) {
    var arr = type === 'material' ? p.materials : p.categories;
    return Array.isArray(arr) ? arr : [];
  }
  function filteredProducts() {
    if (!_filter) return products;
    return products.filter(function (p) { return productTags(p, _filter.type).indexOf(_filter.value) !== -1; });
  }

  // ── Shop mega-menu ──
  function renderShopMenu() {
    ['category', 'material'].forEach(function (type) {
      var col = document.getElementById('shop-menu-' + (type === 'category' ? 'categories' : 'materials'));
      if (!col) return;
      col.innerHTML = TAXONOMY[type].map(function (item) {
        var active = _filter && _filter.type === type && _filter.value === item.slug;
        return '<a href="/#shop/' + type + '/' + item.slug + '" data-shop-filter="' + type + '" data-shop-slug="' + item.slug + '"' +
          (active ? ' class="active"' : '') + '>' + escHtml(item[langKey()] || item.en) + '</a>';
      }).join('');
    });
    var va = document.querySelector('[data-shop-all]');
    if (va) va.classList.toggle('active', !_filter);
  }
  function langKey() { return (typeof getLang === 'function') ? getLang() : 'en'; }

  var _menuCloseTimer = null;
  function openShopMenu() {
    if (_menuCloseTimer) { clearTimeout(_menuCloseTimer); _menuCloseTimer = null; }
    var m = document.getElementById('shop-menu'); if (!m) return;
    renderShopMenu();
    m.classList.add('open'); document.body.classList.add('menu-open');
    var tr = document.getElementById('shop-trigger'); if (tr) tr.setAttribute('aria-expanded', 'true');
  }
  function closeShopMenu() {
    var m = document.getElementById('shop-menu'); if (!m) return;
    m.classList.remove('open'); document.body.classList.remove('menu-open');
    var tr = document.getElementById('shop-trigger'); if (tr) tr.setAttribute('aria-expanded', 'false');
  }
  function toggleShopMenu() {
    var m = document.getElementById('shop-menu');
    if (m && m.classList.contains('open')) closeShopMenu(); else openShopMenu();
  }

  // ── Shop grid ──
  function renderGrid() {
    var grid = document.getElementById('product-grid');
    if (!grid) return;
    if (!products.length) { grid.innerHTML = '<p class="muted" style="padding:24px;">' + t('loading') + '</p>'; return; }
    var list = filteredProducts();
    setText('shop-title', _filter ? taxLabel(_filter.type, _filter.value) : t('collection_heading'));
    var clear = document.getElementById('shop-clear'); if (clear) clear.hidden = !_filter;
    setText('shop-count', list.length + ' ' + t('shop_objects'));
    if (!list.length) { grid.innerHTML = '<p class="muted" style="padding:24px var(--gutter);">' + t('shop_empty') + '</p>'; return; }
    grid.innerHTML = list.map(function (p) {
      var soldOut = totalStock(p) <= 0;
      var hasBack = p.hasBack;
      return '' +
        '<a class="shop-cell' + (hasBack ? ' has-back' : '') + '" href="/products/' + p.slug + '" data-slug="' + p.slug + '">' +
        '  <div class="cell-img">' +
        '    <img src="' + imgPath(p.id, 'FRONT') + '" alt="' + escAttr(pName(p)) + '" loading="lazy" onerror="this.style.opacity=0.1"/>' +
        (hasBack ? '   <img class="img-back" src="' + imgPath(p.id, 'BACK') + '" alt="" loading="lazy"/>' : '') +
        (soldOut ? '   <div class="shop-soldout"><span>' + t('sold_out') + '</span></div>' : '') +
        '  </div>' +
        '  <div class="cell-cap"><div class="cell-name">' + escHtml(pName(p)) + '</div><div class="cell-price">' + formatMoney(productPrice(p)) + '</div></div>' +
        '</a>';
    }).join('');
    grid.querySelectorAll('a.shop-cell').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault(); navigateToProduct(a.getAttribute('data-slug'));
      });
    });
    resize();
  }

  // ── Product detail (full-bleed + overlay card) ──
  var _pdp = null, _selectedSize = null, _open = { size: true, description: false, tag: false }, _addedTimer = null;

  function renderDetail(p) {
    if (!document.getElementById('detail-page')) return;
    _pdp = p; _selectedSize = null; _open = { size: true, description: false, tag: false };

    // images: FRONT (+ BACK + BW extras if present)
    var imgs = [imgPath(p.id, 'FRONT')];
    if (p.hasBack) imgs.push(imgPath(p.id, 'BACK'));
    for (var i = 1; i <= (p.extraCount || 0); i++) imgs.push(imgPath(p.id, 'BW' + i));
    setHtml('pdp-images', imgs.map(function (s) { return '<img src="' + s + '" alt="" onerror="this.style.opacity=0.1"/>'; }).join(''));

    setText('pdp-name', pName(p));
    setText('pdp-price', formatMoney(productPrice(p)));

    // description = details + composition lines; tag = care
    var descLines = (function () {
      var lang = (typeof getLang === 'function') ? getLang() : 'en';
      var lines = (lang === 'pl' && p.compositionLinesPl && p.compositionLinesPl.length) ? p.compositionLinesPl : p.compositionLines;
      var out = '';
      var details = pField(p, 'details'); if (details) out += '<div>' + escHtml(details) + '</div>';
      if (lines && lines.length) out += '<div style="margin-top:10px;">' + lines.map(function (l) { return escHtml(l); }).join('<br/>') + '</div>';
      else { var comp = pField(p, 'composition'); if (comp) out += '<div style="margin-top:10px;">' + escHtml(comp) + '</div>'; }
      return out || '<span class="muted">—</span>';
    })();
    setHtml('pdp-description', descLines);
    setHtml('pdp-tag', '<span class="muted">' + escHtml(pField(p, 'care') || '—') + '</span>');

    // size chips
    var wrap = document.getElementById('pdp-sizes');
    if (wrap) {
      wrap.innerHTML = (p.sizes || []).map(function (s) {
        var out = (s.stock || 0) <= 0;
        return '<button class="size-chip' + (out ? ' out' : '') + '" type="button" data-size="' + escAttr(s.label) + '"' + (out ? ' disabled' : '') + '>' + escHtml(s.label) + '</button>';
      }).join('');
      wrap.querySelectorAll('.size-chip').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          wrap.querySelectorAll('.size-chip').forEach(function (x) { x.classList.remove('selected'); });
          b.classList.add('selected'); _selectedSize = b.getAttribute('data-size');
          setText('pdp-size-error', ''); updateMarkers(); updateAddLabel();
        });
      });
    }

    // add to cart
    var add = document.getElementById('pdp-add');
    if (add) {
      var soldOut = totalStock(p) <= 0;
      add.disabled = soldOut;
      updateAddLabel();
      add.onclick = function () {
        if (soldOut) return;
        if (!_selectedSize) { setText('pdp-size-error', t('select_size')); return; }
        addToCart(p, _selectedSize);
        add.textContent = t('added');
        openCart();
        if (_addedTimer) clearTimeout(_addedTimer);
        _addedTimer = setTimeout(updateAddLabel, 1600);
      };
    }

    // accordions
    document.querySelectorAll('.acc-head').forEach(function (h) {
      h.onclick = function () {
        var key = h.getAttribute('data-acc');
        _open[key] = !_open[key];
        applyAccordions();
      };
    });
    applyAccordions();
  }

  function updateAddLabel() {
    var add = document.getElementById('pdp-add'); if (!add) return;
    if (_pdp && totalStock(_pdp) <= 0) { add.textContent = t('sold_out'); return; }
    add.textContent = _selectedSize ? (t('add_to_cart') + ' — ' + _selectedSize) : t('add_to_cart');
  }
  function updateMarkers() {
    var mk = document.getElementById('mk-size');
    if (mk) mk.textContent = _open.size ? '×' : (_selectedSize || '*');
    ['description', 'tag'].forEach(function (k) { var m = document.getElementById('mk-' + k); if (m) m.textContent = _open[k] ? '×' : '*'; });
  }
  function applyAccordions() {
    ['size', 'description', 'tag'].forEach(function (k) {
      var body = document.getElementById('body-' + k);
      if (body) body.classList.toggle('open', !!_open[k]);
    });
    updateMarkers();
    setTimeout(resize, 340);
  }

  // ── Cart drawer ──
  function openCart() { renderCartDrawer(); var o = document.getElementById('cart-overlay'), d = document.getElementById('cart-drawer'); if (o) o.classList.add('open'); if (d) d.classList.add('open'); }
  function closeCart() { var o = document.getElementById('cart-overlay'), d = document.getElementById('cart-drawer'); if (o) o.classList.remove('open'); if (d) d.classList.remove('open'); }
  function renderCartDrawer() {
    var wrap = document.getElementById('cart-drawer-items'); if (!wrap) return;
    var cart = getCart(), cur = getCurrency(), footer = document.getElementById('cart-drawer-footer');
    if (!cart.length) { wrap.innerHTML = '<div class="cart-empty">' + t('bag_empty') + '</div>'; if (footer) footer.style.display = 'none'; return; }
    if (footer) footer.style.display = '';
    wrap.innerHTML = cart.map(function (item, i) {
      return '<div class="cart-item">' +
        '<div class="cart-item-img"><img src="' + imgPath(item.id, 'FRONT') + '" alt="" onerror="this.style.opacity=0.1"/></div>' +
        '<div><div class="cart-item-name">' + escHtml(item.name) + '</div>' +
        '<div class="cart-item-meta">' + t('size_label') + ' ' + escHtml(item.size) + ' · ×' + (item.qty || 1) + '</div>' +
        '<button class="cart-item-remove" data-remove="' + i + '">' + t('bag_remove') + '</button></div>' +
        '<div class="cart-item-price">' + formatMoney(unitPrice(item, cur) * (item.qty || 1), cur) + '</div></div>';
    }).join('');
    wrap.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { removeFromCart(parseInt(b.getAttribute('data-remove'), 10)); }); });
    setText('cart-drawer-subtotal', formatMoney(cartSubtotal(cur), cur));
  }

  // ── Bag page ──
  function renderBag() {
    var list = document.getElementById('bag-list'); if (!list) return;
    var cart = getCart(), cur = getCurrency(), summary = document.getElementById('bag-summary');
    if (!cart.length) { list.innerHTML = '<div class="cart-empty">' + t('bag_empty') + '</div>'; if (summary) summary.style.display = 'none'; return; }
    if (summary) summary.style.display = '';
    list.innerHTML = cart.map(function (item, i) {
      return '<div class="bag-item">' +
        '<div class="bag-item-img"><img src="' + imgPath(item.id, 'FRONT') + '" alt="" onerror="this.style.opacity=0.1"/></div>' +
        '<div><div class="bag-item-name">' + escHtml(item.name) + '</div>' +
        '<div class="bag-item-meta">' + t('size_label') + ' ' + escHtml(item.size) + ' · ×' + (item.qty || 1) + '</div>' +
        '<button class="cart-item-remove" data-remove="' + i + '">' + t('bag_remove') + '</button></div>' +
        '<div class="bag-item-price">' + formatMoney(unitPrice(item, cur) * (item.qty || 1), cur) + '</div></div>';
    }).join('');
    list.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { removeFromCart(parseInt(b.getAttribute('data-remove'), 10)); }); });
    setText('bag-subtotal-val', formatMoney(cartSubtotal(cur), cur));
  }

  // ── Routing ──
  function findBySlug(slug) { return products.find(function (p) { return p.slug === slug; }); }
  function showPage(name) {
    document.querySelectorAll('[data-page]').forEach(function (el) { el.style.display = (el.getAttribute('data-page') === name) ? '' : 'none'; });
    document.body.classList.toggle('nav-blend', name === 'home');
    document.body.classList.toggle('hide-footer', name === 'detail');
    if (typeof window.aaScrollTop === 'function') window.aaScrollTop(); else window.scrollTo(0, 0);
    if (name === 'bag') renderBag();
    if (name === 'shop') renderGrid();
    resize();
  }
  function navigateTo(section) {
    if (section === 'shop') _filter = null;
    if (history.pushState) history.pushState({}, '', section === 'home' ? '/' : '/#' + section);
    showPage(section);
  }
  function navigateToShopFilter(type, value) {
    _filter = (type && value) ? { type: type, value: value } : null;
    var hash = _filter ? '/#shop/' + type + '/' + value : '/#shop';
    if (history.pushState) history.pushState({}, '', hash);
    closeShopMenu();
    showPage('shop');
  }
  function navigateToProduct(slug) {
    var p = findBySlug(slug); if (!p) return;
    if (history.pushState) history.pushState({}, '', '/products/' + slug);
    renderDetail(p); showPage('detail'); updateMeta(p);
  }
  function handleRoute() {
    var m = window.location.pathname.match(/^\/products\/([^\/?#]+)/);
    if (m) { var p = findBySlug(decodeURIComponent(m[1])); if (p) { renderDetail(p); showPage('detail'); updateMeta(p); return; } }
    closeShopMenu();
    var hash = (window.location.hash || '').replace(/^#/, '');
    var parts = hash.split('/');
    var base = parts[0];
    if (base === 'shop') {
      var type = parts[1], slug = parts[2] ? decodeURIComponent(parts[2]) : '';
      _filter = ((type === 'category' || type === 'material') && isTaxSlug(type, slug)) ? { type: type, value: slug } : null;
      showPage('shop'); return;
    }
    if (['manifesto', 'bag', 'subscribe'].indexOf(base) !== -1) { showPage(base); return; }
    showPage('home');
  }
  function updateMeta(p) {
    if (!p) return;
    document.title = pName(p) + ' — ' + t('brand');
    var c = document.querySelector('link[rel="canonical"]'); if (c) c.setAttribute('href', 'https://anotherartisanal.eu/products/' + p.slug);
    var ogt = document.querySelector('meta[property="og:title"]'); if (ogt) ogt.setAttribute('content', pName(p));
    var ogi = document.querySelector('meta[property="og:image"]'); if (ogi) ogi.setAttribute('content', 'https://anotherartisanal.eu' + imgPath(p.id, 'FRONT'));
  }

  function wireStorefront() {
    if (!document.getElementById('product-grid') && !document.getElementById('detail-page')) return;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.id === 'shop-trigger') return; // handled below as the mega-menu trigger
      a.addEventListener('click', function (e) {
        var target = a.getAttribute('data-nav');
        if (['home', 'shop', 'manifesto', 'bag', 'subscribe'].indexOf(target) !== -1) { e.preventDefault(); navigateTo(target); }
      });
    });

    // ── Shop mega-menu wiring ──
    var trig = document.getElementById('shop-trigger');
    var menu = document.getElementById('shop-menu');
    var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    function scheduleMenuClose() { if (_menuCloseTimer) clearTimeout(_menuCloseTimer); _menuCloseTimer = setTimeout(closeShopMenu, 180); }
    if (trig) {
      trig.addEventListener('click', function (e) { e.preventDefault(); toggleShopMenu(); });
      if (canHover) { trig.addEventListener('mouseenter', openShopMenu); trig.addEventListener('mouseleave', scheduleMenuClose); }
    }
    if (menu) {
      if (canHover) {
        menu.addEventListener('mouseenter', function () { if (_menuCloseTimer) { clearTimeout(_menuCloseTimer); _menuCloseTimer = null; } });
        menu.addEventListener('mouseleave', scheduleMenuClose);
      }
      menu.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null; if (!a) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (a.hasAttribute('data-shop-all')) { navigateToShopFilter(null, null); return; }
        var type = a.getAttribute('data-shop-filter'), slug = a.getAttribute('data-shop-slug');
        if (type && slug) navigateToShopFilter(type, slug);
      });
    }
    var sc = document.getElementById('shop-clear');
    if (sc) sc.addEventListener('click', function (e) { e.preventDefault(); navigateToShopFilter(null, null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeShopMenu(); });
    document.addEventListener('click', function (e) {
      if (!menu || !menu.classList.contains('open')) return;
      if (menu.contains(e.target) || (trig && trig.contains(e.target))) return;
      closeShopMenu();
    });
    var ob = document.getElementById('cart-open-btn'); if (ob) ob.addEventListener('click', openCart);
    var cb = document.getElementById('cart-close-btn'); if (cb) cb.addEventListener('click', closeCart);
    var ov = document.getElementById('cart-overlay'); if (ov) ov.addEventListener('click', closeCart);
    var vb = document.getElementById('view-bag-btn'); if (vb) vb.addEventListener('click', function () { closeCart(); navigateTo('bag'); });
    var sb = document.getElementById('sticky-bag-bar'); if (sb) sb.addEventListener('click', openCart);
    renderGrid(); handleRoute();
    window.addEventListener('popstate', handleRoute);
  }

  function rerenderDetailIfOpen() {
    var d = document.querySelector('[data-page="detail"]');
    if (d && d.style.display !== 'none' && _pdp) renderDetail(_pdp);
  }

  function boot() {
    wireGlobalToggles(); wireNewsletter(); updateHeader();
    if (typeof loadProducts === 'function') {
      wireStorefront();
      loadProducts().then(function () { renderGrid(); if (/^\/products\//.test(window.location.pathname)) handleRoute(); });
    }
    document.addEventListener('cartchange', function () { updateHeader(); renderCartDrawer(); renderBag(); });
    document.addEventListener('currencychange', function () { updateHeader(); renderGrid(); renderCartDrawer(); renderBag(); rerenderDetailIfOpen(); });
    document.addEventListener('langchange', function () { renderShopMenu(); renderGrid(); renderCartDrawer(); renderBag(); rerenderDetailIfOpen(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.AA = {
    getCart: getCart, saveCart: saveCart, removeFromCart: removeFromCart, cartCount: cartCount,
    cartSubtotal: cartSubtotal, unitPrice: unitPrice, getCurrency: getCurrency, setCurrency: setCurrency,
    formatMoney: formatMoney, openCart: openCart, closeCart: closeCart,
  };
})();
