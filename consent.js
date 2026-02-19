(function() {
  var STORAGE_KEY = 'haggly-consent-v1';
  var VALUE_GRANTED = 'granted';
  var VALUE_DENIED = 'denied';
  var listeners = [];
  var currentValue = null;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

  function applyConsent(value) {
    var granted = value === VALUE_GRANTED;
    gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied'
    });
    notify(value);
  }

  function persist(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
    applyConsent(value);
    hideBanner();
  }

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function bannerMarkup() {
    var wrap = document.createElement('div');
    wrap.id = 'haggly-consent-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText = [
      'position:fixed',
      'left:16px',
      'right:16px',
      'bottom:16px',
      'z-index:9999',
      'max-width:760px',
      'margin:0 auto',
      'background:#111',
      'color:#fff',
      'border:1px solid #333',
      'border-radius:12px',
      'box-shadow:0 12px 40px rgba(0,0,0,0.35)',
      'padding:14px'
    ].join(';');

    wrap.innerHTML = '' +
      '<p style="margin:0 0 10px 0;font:500 14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
      'Haggly uses cookies for analytics and ads. Choose whether to allow ad and analytics storage.' +
      '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button id="haggly-consent-accept" type="button" style="background:#22c55e;color:#06220f;border:none;border-radius:8px;padding:8px 12px;font:600 13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;cursor:pointer;">Accept</button>' +
      '<button id="haggly-consent-decline" type="button" style="background:#e5e7eb;color:#111;border:none;border-radius:8px;padding:8px 12px;font:600 13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;cursor:pointer;">Decline</button>' +
      '<a href="/privacy.html" style="color:#93c5fd;font:500 13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;align-self:center;">Privacy policy</a>' +
      '</div>';

    return wrap;
  }

  function showBanner() {
    if (document.getElementById('haggly-consent-banner')) return;
    var b = bannerMarkup();
    document.body.appendChild(b);

    var accept = document.getElementById('haggly-consent-accept');
    var decline = document.getElementById('haggly-consent-decline');
    if (accept) accept.addEventListener('click', function() { persist(VALUE_GRANTED); });
    if (decline) decline.addEventListener('click', function() { persist(VALUE_DENIED); });
  }

  function hideBanner() {
    var b = document.getElementById('haggly-consent-banner');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function addManageButton() {
    if (document.getElementById('haggly-consent-manage')) return;
    var btn = document.createElement('button');
    btn.id = 'haggly-consent-manage';
    btn.type = 'button';
    btn.textContent = 'Privacy choices';
    btn.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:12px',
      'z-index:9998',
      'background:#ffffff',
      'color:#111',
      'border:1px solid #d1d5db',
      'border-radius:999px',
      'padding:8px 12px',
      'font:600 12px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      'cursor:pointer',
      'box-shadow:0 2px 12px rgba(0,0,0,0.12)'
    ].join(';');
    btn.addEventListener('click', showBanner);
    document.body.appendChild(btn);
  }

  function notify(value) {
    currentValue = value;
    listeners.slice().forEach(function(cb) {
      try { cb(value); } catch (e) {}
    });
    try {
      document.dispatchEvent(new CustomEvent('haggly-consent-updated', { detail: { value: value } }));
    } catch (e) {}
  }

  function onChange(cb) {
    if (typeof cb !== 'function') return;
    listeners.push(cb);
    if (currentValue) {
      try { cb(currentValue); } catch (e) {}
    }
  }

  // Default denied until user makes a choice.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function initConsentUi() {
    addManageButton();
    var stored = getStored();
    if (stored === VALUE_GRANTED || stored === VALUE_DENIED) {
      applyConsent(stored);
    } else {
      applyConsent(VALUE_DENIED);
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsentUi);
  } else {
    initConsentUi();
  }

  window.hagglyConsent = {
    get: getStored,
    grant: function() { persist(VALUE_GRANTED); },
    deny: function() { persist(VALUE_DENIED); },
    onChange: onChange,
    reset: function() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      gtag('consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
      });
      addManageButton();
      showBanner();
    }
  };
})();
