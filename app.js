// ── Another Artisanal — front-end app (cart, routing, rendering) ────────────
// Mimics joshuaatelier.com structure: product grid, 2-col detail, slide-out
// cart drawer + sticky bag bar. Safe to include on any page.

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
  function productPrice(p) { return getCurrency() === 'pln' ? p.pricePlnNum : p.priceNum; }

  // ── Cart ──
  function getCart() {
    try { var c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('cartchange'));
  }
  function cartCount() { return getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0); }
  function cartSubtotal(currency) { return getCart().reduce(function (s, i) { return s + unitPrice(i, currency) * (i.qty || 1); }, 0); }
  function addToCart(product, size) {
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === product.id && i.size === size; });
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cart.push({ id: product.id, slug: product.slug, name: product.name, size: size, priceNum: product.priceNum, pricePlnNum: product.pricePlnNum, qty: 1 });
    saveCart(cart);
  }
  function removeFromCart(index) { var cart = getCart(); cart.splice(index, 1); saveCart(cart); }

  // ── localized fields ──
  function pField(p, base) {
    var lang = (typeof getLang === 'function') ? getLang() : 'en';
    if (lang === 'pl' && p[base + 'Pl']) return p[base + 'Pl'];
    return p[base];
  }
  function pName(p) { return pField(p, 'name'); }
  function pTagline(p) { return pField(p, 'tagline'); }
  function imgPath(id, view) { return '/images/' + id + '-' + view + '.jpg'; }
  function totalStock(p) { return (p.sizes || []).reduce(function (s, x) { return s + (x.stock || 0); }, 0); }

  // ── small DOM helpers ──
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function setHtml(id, v) { var el = document.getElementById(id); if (el) el.innerHTML = v; }
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  // ── Header / sticky bar ──
  function updateHeader() {
    var count = cartCount();
    document.querySelectorAll('[data-bag-count]').forEach(function (el) {
      el.textContent = count > 0 ? '(' + count + ')' : '';
    });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-currency-btn') === getCurrency()); });
    document.querySelectorAll('[data-lang-btn]').forEach(function (el) { el.classList.toggle('active', el.getAttribute('data-lang-btn') === (typeof getLang === 'function' ? getLang() : 'en')); });
    var bar = document.getElementById('sticky-bag-bar');
    if (bar) {
      bar.classList.toggle('visible', count > 0);
      document.body.classList.toggle('has-sticky-bar', count > 0);
    }
  }

  function wireGlobalToggles() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (el) {
      el.addEventListener('click', function () { if (typeof setLang === 'function') setLang(el.getAttribute('data-lang-btn')); });
    });
    document.querySelectorAll('[data-currency-btn]').forEach(function (el) {
      el.addEventListener('click', function () { setCurrency(el.getAttribute('data-currency-btn')); });
    });
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
      fetch('/.netlify/functions/newsletter-subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }),
      }).then(function (r) { return r.json(); }).then(function () {
        if (status) status.textContent = t('footer_subscribed'); input.value = '';
      }).catch(function () { if (status) status.textContent = t('checkout_error_generic'); });
    });
  }

  // ── Grid ──
  function renderGrid() {
    var grid = document.getElementById('product-grid');
    if (!grid) return;
    if (!products.length) { grid.innerHTML = '<p class="muted" style="padding:24px;">' + t('loading') + '</p>'; return; }
    grid.innerHTML = products.map(function (p) {
      var soldOut = totalStock(p) <= 0;
      var hasFlip = p.hasBack || p.extraCount > 0;
      var flipSrc = p.hasBack ? imgPath(p.id, 'BACK') : (p.extraCount > 0 ? imgPath(p.id, 'BW1') : '');
      return '' +
        '<a class="product-card' + (hasFlip ? ' has-back' : '') + '" href="/products/' + p.slug + '" data-slug="' + p.slug + '">' +
        '  <div class="img-container">' +
        '    <div class="img-front"><img src="' + imgPath(p.id, 'FRONT') + '" alt="' + escAttr(pName(p)) + '" loading="lazy" onerror="this.style.opacity=0.12"/></div>' +
        (hasFlip ? '    <div class="img-back"><img src="' + flipSrc + '" alt="" loading="lazy"/></div>' : '') +
        (soldOut ? '   <div class="sold-out-overlay"><span class="sold-out-label">' + t('sold_out') + '</span></div>' : '') +
        '  </div>' +
        '  <div class="product-info">' +
        '    <div class="product-name">' + escHtml(pName(p)) + '</div>' +
        '    <div class="product-price">' + formatMoney(productPrice(p)) + '</div>' +
        '  </div>' +
        '</a>';
    }).join('');
    grid.querySelectorAll('a.product-card').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        navigateToProduct(a.getAttribute('data-slug'));
      });
    });
  }

  // ── Detail ──
  var _detailImages = [], _detailIndex = 0, _detailProduct = null;

  function renderDetail(p) {
    if (!document.getElementById('detail-page')) return;
    _detailProduct = p;
    _detailImages = [imgPath(p.id, 'FRONT')];
    if (p.hasBack) _detailImages.push(imgPath(p.id, 'BACK'));
    for (var i = 1; i <= (p.extraCount || 0); i++) _detailImages.push(imgPath(p.id, 'BW' + i));
    _detailIndex = 0;

    setText('detail-name', pName(p));
    setText('detail-tagline', pTagline(p) || '');
    setText('detail-price', formatMoney(productPrice(p)));
    setHtml('detail-details', pField(p, 'details') || '<span class="muted">—</span>');
    setHtml('detail-composition', buildComposition(p));
    setHtml('detail-care', pField(p, 'care') || '<span class="muted">—</span>');

    showDetailImage(0);
    renderThumbs();

    var sizeWrap = document.getElementById('detail-sizes');
    var selected = null;
    if (sizeWrap) {
      sizeWrap.innerHTML = (p.sizes || []).map(function (s) {
        var out = (s.stock || 0) <= 0;
        return '<button class="size-btn' + (out ? ' out-of-stock' : '') + '" type="button" data-size="' + escAttr(s.label) + '"' + (out ? ' disabled' : '') + '>' + escHtml(s.label) + '</button>';
      }).join('');
      sizeWrap.querySelectorAll('.size-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          sizeWrap.querySelectorAll('.size-btn').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          selected = b.getAttribute('data-size');
          setText('detail-size-error', '');
        });
      });
    }

    var addBtn = document.getElementById('detail-add');
    if (addBtn) {
      var soldOut = totalStock(p) <= 0;
      addBtn.disabled = soldOut;
      addBtn.textContent = soldOut ? t('sold_out') : t('add_to_bag');
      addBtn.onclick = function () {
        if (soldOut) return;
        if (!selected) { setText('detail-size-error', t('select_size')); return; }
        addToCart(p, selected);
        openCart();
      };
    }

    // accordion (wire once per render)
    document.querySelectorAll('.more-details-toggle').forEach(function (tog) {
      tog.onclick = function () {
        var key = tog.getAttribute('data-acc');
        var content = document.getElementById('detail-' + key);
        if (!content) return;
        var open = content.classList.toggle('open');
        var sign = tog.querySelector('span:last-child');
        if (sign) sign.textContent = open ? '–' : '+';
      };
    });
  }

  function buildComposition(p) {
    var lang = (typeof getLang === 'function') ? getLang() : 'en';
    var lines = (lang === 'pl' && p.compositionLinesPl && p.compositionLinesPl.length) ? p.compositionLinesPl : p.compositionLines;
    if (lines && lines.length) return '<ul>' + lines.map(function (l) { return '<li>' + escHtml(l) + '</li>'; }).join('') + '</ul>';
    return escHtml(pField(p, 'composition') || '—');
  }
  function renderThumbs() {
    var thumbs = document.getElementById('detail-thumbs');
    if (!thumbs) return;
    if (_detailImages.length <= 1) { thumbs.innerHTML = ''; return; }
    thumbs.innerHTML = _detailImages.map(function (src, i) {
      return '<button class="detail-thumb' + (i === _detailIndex ? ' active' : '') + '" data-idx="' + i + '" type="button"><img src="' + src + '" alt="" loading="lazy" onerror="this.style.opacity=0.12"/></button>';
    }).join('');
    thumbs.querySelectorAll('.detail-thumb').forEach(function (b) {
      b.addEventListener('click', function () { showDetailImage(parseInt(b.getAttribute('data-idx'), 10)); });
    });
  }
  function showDetailImage(idx) {
    if (idx < 0 || idx >= _detailImages.length) return;
    _detailIndex = idx;
    var main = document.getElementById('detail-main-img');
    if (main) main.src = _detailImages[idx];
    var thumbs = document.getElementById('detail-thumbs');
    if (thumbs) thumbs.querySelectorAll('.detail-thumb').forEach(function (b, i) { b.classList.toggle('active', i === idx); });
  }
  function detailNav(dir) {
    if (!_detailImages.length) return;
    var n = (_detailIndex + dir + _detailImages.length) % _detailImages.length;
    showDetailImage(n);
  }

  // ── Cart drawer ──
  function openCart() { renderCartDrawer(); var o = document.getElementById('cart-overlay'), d = document.getElementById('cart-drawer'); if (o) o.classList.add('open'); if (d) d.classList.add('open'); }
  function closeCart() { var o = document.getElementById('cart-overlay'), d = document.getElementById('cart-drawer'); if (o) o.classList.remove('open'); if (d) d.classList.remove('open'); }
  function renderCartDrawer() {
    var wrap = document.getElementById('cart-drawer-items');
    if (!wrap) return;
    var cart = getCart(), cur = getCurrency();
    var footer = document.getElementById('cart-drawer-footer');
    if (!cart.length) {
      wrap.innerHTML = '<div class="cart-empty">' + t('bag_empty') + '</div>';
      if (footer) footer.style.display = 'none';
      return;
    }
    if (footer) footer.style.display = '';
    wrap.innerHTML = cart.map(function (item, i) {
      return '<div class="cart-item">' +
        '<div class="cart-item-img"><img src="' + imgPath(item.id, 'FRONT') + '" alt="" onerror="this.style.opacity=0.12"/></div>' +
        '<div><div class="cart-item-name">' + escHtml(item.name) + '</div>' +
        '<div class="cart-item-meta">' + t('size_label') + ' ' + escHtml(item.size) + ' · ×' + (item.qty || 1) + '</div>' +
        '<button class="cart-item-remove" data-remove="' + i + '">' + t('bag_remove') + '</button></div>' +
        '<div class="cart-item-price">' + formatMoney(unitPrice(item, cur) * (item.qty || 1), cur) + '</div>' +
        '</div>';
    }).join('');
    wrap.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { removeFromCart(parseInt(b.getAttribute('data-remove'), 10)); });
    });
    setText('cart-drawer-subtotal', formatMoney(cartSubtotal(cur), cur));
  }

  // ── Bag page ──
  function renderBag() {
    var list = document.getElementById('bag-list');
    if (!list) return;
    var cart = getCart(), cur = getCurrency();
    var summary = document.getElementById('bag-summary');
    if (!cart.length) {
      list.innerHTML = '<div class="cart-empty">' + t('bag_empty') + '</div>';
      if (summary) summary.style.display = 'none';
      return;
    }
    if (summary) summary.style.display = '';
    list.innerHTML = cart.map(function (item, i) {
      return '<div class="bag-item">' +
        '<div class="bag-item-img"><img src="' + imgPath(item.id, 'FRONT') + '" alt="" onerror="this.style.opacity=0.12"/></div>' +
        '<div><div class="bag-item-name">' + escHtml(item.name) + '</div>' +
        '<div class="bag-item-meta">' + t('size_label') + ' ' + escHtml(item.size) + ' · ×' + (item.qty || 1) + '</div>' +
        '<button class="cart-item-remove" data-remove="' + i + '">' + t('bag_remove') + '</button></div>' +
        '<div class="bag-item-price">' + formatMoney(unitPrice(item, cur) * (item.qty || 1), cur) + '</div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { removeFromCart(parseInt(b.getAttribute('data-remove'), 10)); });
    });
    setText('bag-subtotal-val', formatMoney(cartSubtotal(cur), cur));
  }

  // ── Routing ──
  function findBySlug(slug) { return products.find(function (p) { return p.slug === slug; }); }
  function showPage(name) {
    document.querySelectorAll('[data-page]').forEach(function (el) { el.style.display = (el.getAttribute('data-page') === name) ? '' : 'none'; });
    window.scrollTo(0, 0);
    if (name === 'bag') renderBag();
  }
  function navigateTo(section) { if (history.pushState) history.pushState({}, '', '/#' + section); showPage(section); }
  function navigateToProduct(slug) {
    var p = findBySlug(slug); if (!p) return;
    if (history.pushState) history.pushState({}, '', '/products/' + slug);
    renderDetail(p); showPage('detail'); updateMeta(p);
  }
  function handleRoute() {
    var m = window.location.pathname.match(/^\/products\/([^\/?#]+)/);
    if (m) { var p = findBySlug(decodeURIComponent(m[1])); if (p) { renderDetail(p); showPage('detail'); updateMeta(p); return; } }
    var hash = (window.location.hash || '').replace('#', '');
    if (hash === 'about' || hash === 'bag') { showPage(hash); return; }
    showPage('home');
  }
  function updateMeta(p) {
    if (!p) return;
    document.title = pName(p) + ' — ' + t('brand');
    var c = document.querySelector('link[rel="canonical"]'); if (c) c.setAttribute('href', 'https://anotherartisanal.eu/products/' + p.slug);
    var ogt = document.querySelector('meta[property="og:title"]'); if (ogt) ogt.setAttribute('content', pName(p));
    var ogi = document.querySelector('meta[property="og:image"]'); if (ogi) ogi.setAttribute('content', 'https://anotherartisanal.eu' + imgPath(p.id, 'FRONT'));
  }

  // ── wiring ──
  function wireStorefront() {
    if (!document.getElementById('product-grid') && !document.getElementById('detail-page')) return;

    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = a.getAttribute('data-nav');
        if (target === 'home' || target === 'about' || target === 'bag') { e.preventDefault(); navigateTo(target); }
      });
    });

    var openBtn = document.getElementById('cart-open-btn'); if (openBtn) openBtn.addEventListener('click', openCart);
    var closeBtn = document.getElementById('cart-close-btn'); if (closeBtn) closeBtn.addEventListener('click', closeCart);
    var overlay = document.getElementById('cart-overlay'); if (overlay) overlay.addEventListener('click', closeCart);
    var viewBag = document.getElementById('view-bag-btn'); if (viewBag) viewBag.addEventListener('click', function () { closeCart(); navigateTo('bag'); });
    var sticky = document.getElementById('sticky-bag-bar'); if (sticky) sticky.addEventListener('click', openCart);
    var prev = document.getElementById('detail-prev'); if (prev) prev.addEventListener('click', function () { detailNav(-1); });
    var next = document.getElementById('detail-next'); if (next) next.addEventListener('click', function () { detailNav(1); });

    // swipe on the main detail image (mobile gallery nav)
    var mainImg = document.getElementById('detail-main-img');
    if (mainImg) {
      var sx = 0;
      mainImg.parentElement.addEventListener('touchstart', function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
      mainImg.parentElement.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) detailNav(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    renderGrid();
    handleRoute();
    window.addEventListener('popstate', handleRoute);
  }

  function rerenderDetailIfOpen() {
    var detail = document.querySelector('[data-page="detail"]');
    if (detail && detail.style.display !== 'none' && _detailProduct) renderDetail(_detailProduct);
  }

  function boot() {
    wireGlobalToggles();
    wireNewsletter();
    updateHeader();

    if (typeof loadProducts === 'function') {
      wireStorefront();
      loadProducts().then(function () {
        renderGrid();
        if (/^\/products\//.test(window.location.pathname)) handleRoute();
      });
    }

    document.addEventListener('cartchange', function () { updateHeader(); renderCartDrawer(); renderBag(); });
    document.addEventListener('currencychange', function () { updateHeader(); renderGrid(); renderCartDrawer(); renderBag(); rerenderDetailIfOpen(); });
    document.addEventListener('langchange', function () { renderGrid(); renderCartDrawer(); renderBag(); rerenderDetailIfOpen(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.AA = {
    getCart: getCart, saveCart: saveCart, removeFromCart: removeFromCart,
    cartCount: cartCount, cartSubtotal: cartSubtotal, unitPrice: unitPrice,
    getCurrency: getCurrency, setCurrency: setCurrency, formatMoney: formatMoney,
    openCart: openCart, closeCart: closeCart,
  };
})();
