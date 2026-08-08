var products = [];

var _SUPABASE_URL = (window.AA_CONFIG && window.AA_CONFIG.SUPABASE_URL) || '';
var _SUPABASE_ANON_KEY = (window.AA_CONFIG && window.AA_CONFIG.SUPABASE_ANON_KEY) || '';

// Stale-while-revalidate cache. Bump the version suffix when the row map below
// changes so cached entries from older schemas are dropped.
var _PRODUCTS_CACHE_KEY = 'aa-products-cache-v2';
var _PLN_FALLBACK_RATE = 4.30;

// Synchronously hydrate `products` from localStorage so the grid can render
// immediately with stale data while loadProducts() does its network round trip.
try {
  var _cached = localStorage.getItem(_PRODUCTS_CACHE_KEY);
  if (_cached) {
    var _parsed = JSON.parse(_cached);
    if (Array.isArray(_parsed) && _parsed.length > 0) products = _parsed;
  }
} catch (e) { /* localStorage unavailable or corrupt — fall through to network load */ }

// Coerce a JSONB tag array to a clean list of string slugs. `legacy` is the old
// single-value column used as a fallback so rows predating the migration still filter.
var _LEGACY_CAT_MAP = { jacket: 'coats-jackets', jumper: 'jerseys', tshirt: 'shirts', pants: 'pants' };
function _normalizeTags(raw, legacy) {
  if (Array.isArray(raw) && raw.length) {
    return raw.filter(function (s) { return s != null && s !== ''; }).map(function (s) { return String(s); });
  }
  if (legacy) { var mapped = _LEGACY_CAT_MAP[legacy] || legacy; return [String(mapped)]; }
  return [];
}

function _normalizeSizes(raw) {
  // Accept the JSONB array [{label, stock}] and coerce to a clean shape.
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(function(s) { return s && s.label != null; })
    .map(function(s) { return { label: String(s.label), stock: Number(s.stock) || 0 }; });
}

async function loadProducts() {
  try {
    var res = await fetch(_SUPABASE_URL + '/rest/v1/products?active=eq.true&order=sort_order,id', {
      headers: { 'apikey': _SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + _SUPABASE_ANON_KEY },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var rows = await res.json();
    products = rows.map(function(r) {
      var priceNum = r.price_eur / 100;
      // price_pln is grosze; falls back to spot conversion only when NULL.
      var pricePlnNum = r.price_pln != null ? r.price_pln / 100 : Math.round(priceNum * _PLN_FALLBACK_RATE);
      var sizes = _normalizeSizes(r.sizes);
      var stock = {};
      sizes.forEach(function(s) { stock[s.label] = s.stock; });
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        namePl: r.name_pl || r.name,
        tagline: r.tagline,
        taglinePl: r.tagline_pl || r.tagline,
        category: r.category || '',
        categories: _normalizeTags(r.categories, r.category),
        materials: _normalizeTags(r.materials, null),
        priceNum: priceNum,
        pricePlnNum: pricePlnNum,
        sizes: sizes,          // ordered [{label, stock}]
        stock: stock,          // { label: stock } convenience map
        composition: r.composition,
        compositionPl: r.composition_pl || r.composition,
        compositionLines: r.composition_lines || [],
        compositionLinesPl: r.composition_lines_pl || r.composition_lines || [],
        care: r.care,
        carePl: r.care_pl || r.care,
        details: r.details,
        detailsPl: r.details_pl || r.details,
        hasBack: r.has_back,
        extraCount: r.extra_count != null ? r.extra_count : 0,
      };
    });
    try { localStorage.setItem(_PRODUCTS_CACHE_KEY, JSON.stringify(products)); } catch (e) { /* over quota — non-fatal */ }
  } catch (e) {
    console.error('Failed to load products:', e);
  }
}
