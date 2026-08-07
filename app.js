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

  // ── Shop grid ──
  function renderGrid() {
    var grid = document.getElementById('product-grid');
    if (!grid) return;
    if (!products.length) { grid.innerHTML = '<p class="muted" style="padding:24px;">' + t('loading') + '</p>'; return; }
    setText('shop-count', products.length + ' ' + t('shop_objects'));
    grid.innerHTML = products.map(function (p) {
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
    document.body.classList.toggle('hide-footer', name === 'home' || name === 'detail');
    if (typeof window.aaScrollTop === 'function') window.aaScrollTop(); else window.scrollTo(0, 0);
    if (name === 'bag') renderBag();
    if (name === 'shop') renderGrid();
    resize();
  }
  function navigateTo(section) { if (history.pushState) history.pushState({}, '', section === 'home' ? '/' : '/#' + section); showPage(section); }
  function navigateToProduct(slug) {
    var p = findBySlug(slug); if (!p) return;
    if (history.pushState) history.pushState({}, '', '/products/' + slug);
    renderDetail(p); showPage('detail'); updateMeta(p);
  }
  function handleRoute() {
    var m = window.location.pathname.match(/^\/products\/([^\/?#]+)/);
    if (m) { var p = findBySlug(decodeURIComponent(m[1])); if (p) { renderDetail(p); showPage('detail'); updateMeta(p); return; } }
    var hash = (window.location.hash || '').replace('#', '');
    if (['shop', 'manifesto', 'bag', 'subscribe'].indexOf(hash) !== -1) { showPage(hash); return; }
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
      a.addEventListener('click', function (e) {
        var target = a.getAttribute('data-nav');
        if (['home', 'shop', 'manifesto', 'bag', 'subscribe'].indexOf(target) !== -1) { e.preventDefault(); navigateTo(target); }
      });
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
    document.addEventListener('langchange', function () { renderGrid(); renderCartDrawer(); renderBag(); rerenderDetailIfOpen(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.AA = {
    getCart: getCart, saveCart: saveCart, removeFromCart: removeFromCart, cartCount: cartCount,
    cartSubtotal: cartSubtotal, unitPrice: unitPrice, getCurrency: getCurrency, setCurrency: setCurrency,
    formatMoney: formatMoney, openCart: openCart, closeCart: closeCart,
  };
})();
