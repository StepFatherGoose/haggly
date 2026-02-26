(function() {
  var CACHE_KEY = 'haggly-pro-entitlement-cache-v1';
  var AD_CLIENT = 'ca-pub-6632867015737384';
  var AUTH_GRACE_MS = 1200;
  var loaded = false;
  var domReady = document.readyState !== 'loading';
  var fallbackTimer = null;
  var latestProDetail = null;
  var latestAuthDetail = null;

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
    if (loaded || shouldSuppressAds() || (latestProDetail && latestProDetail.is_pro)) return;
    loaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
    script.crossOrigin = 'anonymous';
    script.dataset.hagglyAds = '1';
    document.head.appendChild(script);
  }

  function clearFallbackTimer() {
    if (!fallbackTimer) return;
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  function maybeLoadAfterSignals() {
    if (!domReady) return;
    if (shouldSuppressAds() || (latestProDetail && latestProDetail.is_pro)) {
      clearFallbackTimer();
      return;
    }

    if (latestAuthDetail && latestAuthDetail.available === false) {
      clearFallbackTimer();
      loadAdSense();
      return;
    }

    if (latestProDetail && (latestProDetail.signed_in === false || (latestProDetail.signed_in && !latestProDetail.is_pro))) {
      clearFallbackTimer();
      loadAdSense();
      return;
    }

    if (!fallbackTimer) {
      fallbackTimer = setTimeout(function() {
        fallbackTimer = null;
        loadAdSense();
      }, AUTH_GRACE_MS);
    }
  }

  document.addEventListener('haggly-auth-ready', function(event) {
    latestAuthDetail = event && event.detail ? event.detail : null;
    maybeLoadAfterSignals();
  });

  document.addEventListener('haggly-pro-updated', function(event) {
    latestProDetail = event && event.detail ? event.detail : null;
    maybeLoadAfterSignals();
  });

  window.hagglyAds = {
    load: loadAdSense,
    shouldSuppressAds: shouldSuppressAds
  };

  if (domReady) {
    maybeLoadAfterSignals();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      domReady = true;
      maybeLoadAfterSignals();
    }, { once: true });
  }
})();
