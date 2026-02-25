(function() {
  var CACHE_KEY = 'haggly-pro-entitlement-cache-v1';
  var AD_CLIENT = 'ca-pub-6632867015737384';
  var loaded = false;

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function shouldSuppressAds() {
    var cache = readCache();
    if (!cache) return false;
    return Boolean(cache.is_pro);
  }

  function loadAdSense() {
    if (loaded || shouldSuppressAds()) return;
    loaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
    script.crossOrigin = 'anonymous';
    script.dataset.hagglyAds = '1';
    document.head.appendChild(script);
  }

  window.hagglyAds = {
    load: loadAdSense,
    shouldSuppressAds: shouldSuppressAds
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAdSense, { once: true });
  } else {
    loadAdSense();
  }
})();
