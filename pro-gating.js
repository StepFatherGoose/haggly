(function() {
  var CACHE_KEY = 'haggly-pro-entitlement-cache-v1';
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var current = {
    signed_in: false,
    is_pro: false,
    subscription_status: 'none',
    features: {
      ad_free: false,
      custom_phrase: false,
      recent_phrases: false,
      premium_actions: false,
      premium_tones: false
    },
    user: null
  };

  function t(key, fallback) {
    if (window.hagglyI18n && typeof window.hagglyI18n.t === 'function') {
      return window.hagglyI18n.t(key, fallback);
    }
    return fallback || key;
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('haggly-pro-updated', { detail: current }));
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.cached_at || (Date.now() - parsed.cached_at > CACHE_TTL_MS)) return parsed; // stale allowed for ads/UI until refresh
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.assign({}, data, { cached_at: Date.now() })));
    } catch (_) {}
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  function normalize(data) {
    var isPro = Boolean(data && data.is_pro);
    return {
      signed_in: Boolean(data && (data.user || data.signed_in)),
      user: data && data.user ? data.user : null,
      is_pro: isPro,
      plan_code: data && data.plan_code ? data.plan_code : 'haggly_pro',
      subscription_status: data && data.subscription_status ? data.subscription_status : 'none',
      cancel_at_period_end: Boolean(data && data.cancel_at_period_end),
      current_period_end: (data && data.current_period_end) || null,
      features: Object.assign({
        ad_free: isPro,
        custom_phrase: isPro,
        recent_phrases: isPro,
        premium_actions: isPro,
        premium_tones: isPro
      }, (data && data.features) || {})
    };
  }

  function setCurrent(data) {
    current = normalize(data || {});
    writeCache(current);
    emit();
    return current;
  }

  function loadFromCache() {
    var cache = readCache();
    if (!cache) {
      current = normalize({});
      return current;
    }
    current = normalize(cache);
    return current;
  }

  function can(feature) {
    if (!feature) return current.is_pro;
    return Boolean(current.features && current.features[feature]);
  }

  function upsell(feature) {
    var params = feature ? ('?feature=' + encodeURIComponent(feature)) : '';
    window.location.href = '/pro.html' + params;
  }

  function showLockToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return false;
    toast.textContent = message || t('pro_unlock_with_subscription', 'Unlock with Pro Subscription');
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
    return true;
  }

  function handleLockedClick(event) {
    var lockTarget = event.target.closest('[data-pro-lock]');
    if (!lockTarget) return;
    event.preventDefault();
    event.stopPropagation();
    var msg = lockTarget.getAttribute('data-lock-message') || t('pro_unlock_with_subscription', 'Unlock with Pro Subscription');
    showLockToast(msg);
    if (lockTarget.getAttribute('data-lock-nav') !== 'false') {
      setTimeout(function() { upsell(lockTarget.getAttribute('data-pro-lock')); }, 200);
    }
  }

  function markLocked(el, feature, message) {
    if (!el) return el;
    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      el.disabled = true;
    }
    el.setAttribute('aria-disabled', 'true');
    el.dataset.proLock = feature || 'pro_feature';
    el.dataset.lockMessage = message || t('pro_unlock_with_subscription', 'Unlock with Pro Subscription');
    el.classList.add('pro-locked-control');
    return el;
  }

  async function refresh(force) {
    loadFromCache();
    if (!window.hagglyAuth || !window.hagglyAuth.fetchProStatus) {
      emit();
      return current;
    }
    if (!force) {
      var cache = readCache();
      if (cache && cache.cached_at && (Date.now() - cache.cached_at) < CACHE_TTL_MS) {
        current = normalize(cache);
        emit();
        return current;
      }
    }
    try {
      var data = await window.hagglyAuth.fetchProStatus();
      return setCurrent(data);
    } catch (_) {
      emit();
      return current;
    }
  }

  async function initPage(options) {
    loadFromCache();
    if (options && options.decorateNav) {
      var nav = document.querySelector('nav');
      if (nav && window.hagglyAuth && window.hagglyAuth.decorateNav) {
        window.hagglyAuth.decorateNav(nav);
      }
    }
    emit();
    if (!options || options.refresh !== false) {
      await refresh(Boolean(options && options.force));
    }
    document.removeEventListener('click', handleLockedClick, true);
    document.addEventListener('click', handleLockedClick, true);
    return current;
  }

  function renderProOnlyPlaceholder(container, text, ctaText) {
    if (!container) return;
    container.hidden = false;
    container.innerHTML = '';
    var box = document.createElement('div');
    box.style.cssText = 'border:1px dashed #c9cde5;background:#f7f8ff;border-radius:12px;padding:14px;text-align:center;color:#50566f;';
    var p = document.createElement('p');
    p.textContent = text || t('pro_unlock_with_subscription', 'Unlock with Pro Subscription');
    p.style.margin = '0 0 8px';
    var a = document.createElement('a');
    a.href = '/pro.html';
    a.textContent = ctaText || t('pro_unlock_cta', 'Unlock Pro');
    a.style.cssText = 'display:inline-block;background:#5865F2;color:white;text-decoration:none;padding:8px 12px;border-radius:8px;font-weight:700;';
    box.appendChild(p);
    box.appendChild(a);
    container.appendChild(box);
  }

  window.hagglyPro = {
    initPage: initPage,
    refresh: refresh,
    getState: function() { return current; },
    isPro: function() { return Boolean(current.is_pro); },
    can: can,
    upsell: upsell,
    markLocked: markLocked,
    showLockToast: showLockToast,
    setCurrent: setCurrent,
    clearCache: clearCache,
    renderProOnlyPlaceholder: renderProOnlyPlaceholder,
    cacheKey: CACHE_KEY
  };

  loadFromCache();
})();
