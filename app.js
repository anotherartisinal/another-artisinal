// ── Another Artisanal — front-end app (cart, routing, rendering) ────────────
// Safe to include on any page: shared cart/currency/format helpers always run;
// page-specific rendering only runs when its container exists.

(function () {
  'use strict';

  var CART_KEY = 'aa-cart';
  var CURRENCY_KEY = 'aa-currency';

  // ── Currency ──────────────────────────────────────────────────────────────
  function getCurrency() {
    try { var c = localStorage.getItem(CURRENCY_KEY); if (c === 'eur' || c === 'pln') return c; } catch (e) {}
    return 'eur';
  }
  function setCurrency(c) {
    if (c !== 'eur' && c !== 'pln') return;
    try { localStorage.setItem(CURRENCY_KEY, c); } catch (e) {}
    document.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: c } }));
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

  // ── Cart ──────────────────────────────────────────────────────────────────
  function getCart() {
    try { var c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('cartchange'));
  }
  function cartCount() { return getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0); }
  function cartSubtotal(currency) {
    return getCart().reduce(function (s, i) { return s + unitPrice(i, currency) * (i.qty || 1); }, 0);
  }
  function addToCart(product, size) {
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === product.id && i.size === size; });
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({
        id: product.id, slug: product.slug, name: product.name, size: size,
        priceNum: product.priceNum, pricePlnNum: product.pricePlnNum, qty: 1,
      });
    }
    saveCart(cart);
  }
  function removeFromCart(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
  }
  function setQty(index, qty) {
    var cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = Math.max(1, qty);
    saveCart(cart);
  }

  // localized product field accessor
  function pField(p, base) {
    var lang = (typeof getLang === 'function') ? getLang() : 'en';
    if (lang === 'pl' && p[base + 'Pl']) return p[base + 'Pl'];
    return p[base];
  }
  function pName(p) { return pField(p, 'name'); }
  function pTagline(p) { return pField(p, 'tagline'); }

  function imgPath(id, view) { return '/images/' + id + '-' + view + '.jpg'; }
  function totalStock(p) { return (p.sizes || []).reduce(function (s, x) { return s + (x.stock || 0); }, 0); }

  // ── Header (bag count + currency + language toggles) ────────────────────────
  function updateHeader() {
    var count = cartCount();
    document.querySelectorAll('[data-bag-count]').forEach(function (el) {
      el.textContent = count > 0 ? String(count) : '';
      el.classList.toggle('has-items', count > 0);
    });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-currency-btn') === getCurrency());
    });
  }

  function wireGlobalToggles() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (typeof setLang === 'function') setLang(el.getAttribute('data-lang-btn'));
      });
    });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) {
      el.addEventListener('click', function () { setCurrency(el.getAttribute('data-currency-btn')); });
    });
  }

  // ── Newsletter (footer) ─────────────────────────────────────────────────────
  function wireNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var status = document.getElementById('newsletter-status');
      var email = input && input.value.trim();
      if (!email) return;
      fetch('/.netlify/functions/newsletter-subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      }).then(function (r) { return r.json(); }).then(function () {
        if (status) status.textContent = t('footer_subscribed');
        input.value = '';
      }).catch(function () {
        if (status) status.textContent = t('checkout_error_generic');
      });
    });
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  function renderGrid() {
    var grid = document.getElementById('product-grid');
    if (!grid) return;
    if (!products.length) { grid.innerHTML = '<p class="muted">' + t('loading') + '</p>'; return; }
    grid.innerHTML = products.map(function (p) {
      var soldOut = totalStock(p) <= 0;
      var flip = p.hasBack ? imgPath(p.id, 'BACK') : (p.extraCount > 0 ? imgPath(p.id, 'BW1') : '');
      return '' +
        '<a class="card" href="/products/' + p.slug + '" data-slug="' + p.slug + '">' +
        '  <div class="card-img' + (flip ? ' has-flip' : '') + '">' +
        '    <img src="' + imgPath(p.id, 'FRONT') + '" alt="' + escAttr(pName(p)) + '" loading="lazy" onerror="this.style.opacity=0.12"/>' +
        (flip ? '    <img class="card-img-flip" src="' + flip + '" alt="" loading="lazy"/>' : '') +
        (soldOut ? '   <span class="tag-soldout" data-i18n="sold_out">' + t('sold_out') + '</span>' : '') +
        '  </div>' +
        '  <div class="card-meta">' +
        '    <span class="card-name">' + escHtml(pName(p)) + '</span>' +
        '    <span class="card-price">' + formatMoney(getCurrency() === 'pln' ? p.pricePlnNum : p.priceNum) + '</span>' +
        '  </div>' +
        '</a>';
    }).join('');
    grid.querySelectorAll('a.card').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // preserve new-tab
        e.preventDefault();
        navigateToProduct(a.getAttribute('data-slug'));
      });
    });
  }

  // ── Detail ──────────────────────────────────────────────────────────────────
  var _detailImages = [];
  var _detailIndex = 0;

  function renderDetail(p) {
    var wrap = document.getElementById('detail-page');
    if (!wrap) return;
    // build image list: FRONT, BACK?, BW1..n
    _detailImages = [imgPath(p.id, 'FRONT')];
    if (p.hasBack) _detailImages.push(imgPath(p.id, 'BACK'));
    for (var i = 1; i <= (p.extraCount || 0); i++) _detailImages.push(imgPath(p.id, 'BW' + i));
    _detailIndex = 0;

    setText('detail-name', pName(p));
    setText('detail-tagline', pTagline(p) || '');
    setText('detail-price', formatMoney(getCurrency() === 'pln' ? p.pricePlnNum : p.priceNum));
    setHtml('detail-details', pField(p, 'details') || '');
    setHtml('detail-composition', buildComposition(p));
    setHtml('detail-care', pField(p, 'care') || '');

    showDetailImage(0);
    renderThumbs();

    // size selector
    var sizeWrap = document.getElementById('detail-sizes');
    if (sizeWrap) {
      sizeWrap.innerHTML = (p.sizes || []).map(function (s) {
        var out = (s.stock || 0) <= 0;
        return '<button class="size-btn" type="button" data-size="' + escAttr(s.label) + '"' + (out ? ' disabled' : '') + '>' +
          escHtml(s.label) + '</button>';
      }).join('');
      var selected = null;
      sizeWrap.querySelectorAll('.size-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          sizeWrap.querySelectorAll('.size-btn').forEach(function (x) { x.classList.remove('selected'); });
          b.classList.add('selected');
          selected = b.getAttribute('data-size');
          var err = document.getElementById('detail-size-error');
          if (err) err.textContent = '';
        });
      });

      var addBtn = document.getElementById('detail-add');
      if (addBtn) {
        var soldOut = totalStock(p) <= 0;
        addBtn.disabled = soldOut;
        addBtn.textContent = soldOut ? t('sold_out') : t('add_to_bag');
        addBtn.onclick = function () {
          if (soldOut) return;
          if (!selected) {
            var err = document.getElementById('detail-size-error');
            if (err) err.textContent = t('select_size');
            return;
          }
          addToCart(p, selected);
          navigateTo('bag');
        };
      }
    }
  }

  function buildComposition(p) {
    var lang = (typeof getLang === 'function') ? getLang() : 'en';
    var lines = (lang === 'pl' && p.compositionLinesPl && p.compositionLinesPl.length) ? p.compositionLinesPl : p.compositionLines;
    if (lines && lines.length) {
      return '<ul class="comp-list">' + lines.map(function (l) { return '<li>' + escHtml(l) + '</li>'; }).join('') + '</ul>';
    }
    return escHtml(pField(p, 'composition') || '');
  }

  function renderThumbs() {
    var thumbs = document.getElementById('detail-thumbs');
    if (!thumbs) return;
    thumbs.innerHTML = _detailImages.map(function (src, i) {
      return '<button class="thumb' + (i === _detailIndex ? ' active' : '') + '" data-idx="' + i + '" type="button">' +
        '<img src="' + src + '" alt="" loading="lazy" onerror="this.style.opacity=0.12"/></button>';
    }).join('');
    thumbs.querySelectorAll('.thumb').forEach(function (b) {
      b.addEventListener('click', function () { showDetailImage(parseInt(b.getAttribute('data-idx'), 10)); });
    });
  }

  function showDetailImage(idx) {
    if (idx < 0 || idx >= _detailImages.length) return;
    _detailIndex = idx;
    var main = document.getElementById('detail-main-img');
    if (main) { main.src = _detailImages[idx]; }
    var thumbs = document.getElementById('detail-thumbs');
    if (thumbs) thumbs.querySelectorAll('.thumb').forEach(function (b, i) { b.classList.toggle('active', i === idx); });
  }

  // ── Bag ──────────────────────────────────────────────────────────────────────
  function renderBag() {
    var list = document.getElementById('bag-list');
    if (!list) return;
    var cart = getCart();
    var cur = getCurrency();
    if (!cart.length) {
      list.innerHTML = '<p class="muted">' + t('bag_empty') + '</p>';
      var sub = document.getElementById('bag-subtotal-val'); if (sub) sub.textContent = formatMoney(0, cur);
      var co = document.getElementById('bag-checkout-btn'); if (co) co.style.display = 'none';
      return;
    }
    list.innerHTML = cart.map(function (item, i) {
      return '' +
        '<div class="bag-row">' +
        '  <img class="bag-thumb" src="' + imgPath(item.id, 'FRONT') + '" alt="" onerror="this.style.opacity=0.12"/>' +
        '  <div class="bag-info">' +
        '    <div class="bag-name">' + escHtml(item.name) + '</div>' +
        '    <div class="bag-sub">' + t('size_label') + ' ' + escHtml(item.size) + ' · ×' + (item.qty || 1) + '</div>' +
        '    <button class="link-btn" data-remove="' + i + '">' + t('bag_remove') + '</button>' +
        '  </div>' +
        '  <div class="bag-price">' + formatMoney(unitPrice(item, cur) * (item.qty || 1), cur) + '</div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { removeFromCart(parseInt(b.getAttribute('data-remove'), 10)); });
    });
    var subEl = document.getElementById('bag-subtotal-val'); if (subEl) subEl.textContent = formatMoney(cartSubtotal(cur), cur);
    var coBtn = document.getElementById('bag-checkout-btn'); if (coBtn) coBtn.style.display = '';
  }

  // ── Routing (SPA sections + /products/<slug>) ────────────────────────────────
  function findBySlug(slug) { return products.find(function (p) { return p.slug === slug; }); }

  function showPage(name) {
    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.style.display = (el.getAttribute('data-page') === name) ? '' : 'none';
    });
    window.scrollTo(0, 0);
    if (name === 'bag') renderBag();
  }

  function navigateTo(section) {
    if (history.pushState) history.pushState({}, '', '/#' + section);
    showPage(section);
  }

  function navigateToProduct(slug) {
    var p = findBySlug(slug);
    if (!p) return;
    if (history.pushState) history.pushState({}, '', '/products/' + slug);
    renderDetail(p);
    showPage('detail');
    updateMeta(p);
  }

  function handleRoute() {
    var path = window.location.pathname;
    var m = path.match(/^\/products\/([^\/?#]+)/);
    if (m) {
      var p = findBySlug(decodeURIComponent(m[1]));
      if (p) { renderDetail(p); showPage('detail'); updateMeta(p); return; }
    }
    var hash = (window.location.hash || '').replace('#', '');
    if (hash === 'about' || hash === 'bag' || hash === 'shop') { showPage(hash === 'shop' ? 'home' : hash); return; }
    showPage('home');
  }

  function updateMeta(p) {
    if (!p) return;
    document.title = pName(p) + ' — ' + t('brand');
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://anotherartisanal.eu/products/' + p.slug);
    var ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', pName(p));
    var ogi = document.querySelector('meta[property="og:image"]');
    if (ogi) ogi.setAttribute('content', 'https://anotherartisanal.eu' + imgPath(p.id, 'FRONT'));
  }

  // ── small DOM helpers ─────────────────────────────────────────────────────────
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function setHtml(id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  function initHomePage() {
    if (!document.getElementById('product-grid') && !document.getElementById('detail-page')) return;
    renderGrid();
    handleRoute();
    window.addEventListener('popstate', handleRoute);
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = a.getAttribute('data-nav');
        if (target === 'home' || target === 'about' || target === 'bag') {
          e.preventDefault();
          navigateTo(target === 'home' ? 'shop' : target);
          if (target === 'home') showPage('home');
        }
      });
    });
  }

  function boot() {
    wireGlobalToggles();
    wireNewsletter();
    updateHeader();

    // Render grid immediately from cache (SWR), then refresh after network load.
    if (typeof loadProducts === 'function') {
      initHomePage();
      loadProducts().then(function () {
        renderGrid();
        // if we're on a product URL that wasn't in cache, resolve it now
        handleRouteIfDetail();
      });
    }

    document.addEventListener('cartchange', function () { updateHeader(); renderBag(); });
    document.addEventListener('currencychange', function () { updateHeader(); renderGrid(); renderBag(); rerenderDetailIfOpen(); });
    document.addEventListener('langchange', function () { renderGrid(); renderBag(); rerenderDetailIfOpen(); });
  }

  function handleRouteIfDetail() {
    var path = window.location.pathname;
    if (/^\/products\//.test(path)) handleRoute();
  }
  function rerenderDetailIfOpen() {
    var detail = document.querySelector('[data-page="detail"]');
    if (detail && detail.style.display !== 'none') {
      var m = window.location.pathname.match(/^\/products\/([^\/?#]+)/);
      if (m) { var p = findBySlug(decodeURIComponent(m[1])); if (p) renderDetail(p); }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Expose cart/format API for checkout.html + other pages.
  window.AA = {
    getCart: getCart, saveCart: saveCart, removeFromCart: removeFromCart, setQty: setQty,
    cartCount: cartCount, cartSubtotal: cartSubtotal, unitPrice: unitPrice,
    getCurrency: getCurrency, setCurrency: setCurrency, formatMoney: formatMoney,
  };
})();
