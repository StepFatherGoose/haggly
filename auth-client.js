(function() {
  var configPromise;
  var clientPromise;
  var state = {
    config: null,
    client: null,
    session: null,
    user: null,
    ready: false,
    authAvailable: false
  };

  function t(key, fallback) {
    if (window.hagglyI18n && typeof window.hagglyI18n.t === 'function') {
      return window.hagglyI18n.t(key, fallback);
    }
    return fallback || key;
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  async function getPublicConfig() {
    if (!configPromise) {
      configPromise = fetch('/api/public-config', { credentials: 'same-origin' })
        .then(function(res) {
          if (!res.ok) throw new Error('Failed to load config');
          return res.json();
        })
        .then(function(cfg) {
          state.config = cfg;
          return cfg;
        })
        .catch(function() {
          state.config = { pro_enabled: false, supabase_url: '', supabase_anon_key: '', site_url: '' };
          return state.config;
        });
    }
    return configPromise;
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async function() {
        var cfg = await getPublicConfig();
        if (!cfg.supabase_url || !cfg.supabase_anon_key || !window.supabase || !window.supabase.createClient) {
          state.ready = true;
          state.authAvailable = false;
          emit('haggly-auth-ready', { available: false });
          return null;
        }
        var client = window.supabase.createClient(cfg.supabase_url, cfg.supabase_anon_key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        state.client = client;
        state.authAvailable = true;

        var sessionResult = await client.auth.getSession();
        state.session = sessionResult.data ? sessionResult.data.session : null;
        state.user = state.session ? state.session.user : null;
        state.ready = true;
        emit('haggly-auth-ready', { available: true, session: state.session, user: state.user });

        client.auth.onAuthStateChange(function(_event, session) {
          state.session = session || null;
          state.user = session ? session.user : null;
          emit('haggly-auth-changed', { session: state.session, user: state.user });
          if (!session) {
            try { localStorage.removeItem('haggly-pro-entitlement-cache-v1'); } catch (_) {}
          }
        });

        return client;
      })();
    }
    return clientPromise;
  }

  async function getAccessToken() {
    var client = await getClient();
    if (!client) return null;
    var result = await client.auth.getSession();
    var session = result.data ? result.data.session : null;
    state.session = session || null;
    state.user = session ? session.user : null;
    return session ? session.access_token : null;
  }

  async function signInWithMagicLink(email, redirectTo) {
    var client = await getClient();
    if (!client) throw new Error('Auth not configured');
    writeJSON('haggly-auth-last-email', { email: email, at: Date.now() });
    return client.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: redirectTo }
    });
  }

  async function signOut() {
    var client = await getClient();
    if (!client) return;
    await client.auth.signOut();
    try { localStorage.removeItem('haggly-pro-entitlement-cache-v1'); } catch (_) {}
  }

  async function fetchProStatus() {
    var token = await getAccessToken();
    if (!token) return { signed_in: false, is_pro: false, subscription_status: 'none' };
    var res = await fetch('/api/me/pro-status', {
      headers: { Authorization: 'Bearer ' + token },
      credentials: 'same-origin'
    });
    if (!res.ok) {
      var body = await res.json().catch(function() { return {}; });
      throw new Error(body.error || 'Failed to load Pro status');
    }
    return res.json();
  }

  async function callAuthedJson(url, options) {
    var token = await getAccessToken();
    if (!token) throw new Error('Sign in required');
    var res = await fetch(url, Object.assign({}, options || {}, {
      headers: Object.assign({}, (options && options.headers) || {}, {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }),
      credentials: 'same-origin'
    }));
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function decorateNav(nav) {
    if (!nav || nav.querySelector('[data-auth-slot]')) return;
    var slot = document.createElement('div');
    slot.dataset.authSlot = '1';
    slot.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

    var status = document.createElement('span');
    status.id = 'authNavStatus';
    status.style.cssText = 'color:white;font-size:12px;opacity:.85;';

    var loginLink = document.createElement('a');
    loginLink.href = '/login.html';
    loginLink.textContent = t('auth_nav_login', 'Log In');
    loginLink.dataset.authLogin = '1';

    var proLink = document.createElement('a');
    proLink.href = '/pro.html';
    proLink.textContent = t('auth_nav_go_pro', 'Go Pro');
    proLink.dataset.authPro = '1';
    proLink.style.cssText = 'background:#FFD166;color:#1a1a1a;';

    var accountLink = document.createElement('a');
    accountLink.href = '/account.html';
    accountLink.textContent = t('auth_nav_account', 'Account');
    accountLink.dataset.authAccount = '1';
    accountLink.hidden = true;

    var logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.textContent = t('auth_nav_logout', 'Log Out');
    logoutBtn.dataset.authLogout = '1';
    logoutBtn.hidden = true;
    logoutBtn.style.cssText = 'background:rgba(255,255,255,0.14);color:white;border:none;padding:6px 12px;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;';
    logoutBtn.addEventListener('click', function() {
      signOut().catch(function() {});
    });

    slot.appendChild(status);
    slot.appendChild(loginLink);
    slot.appendChild(proLink);
    slot.appendChild(accountLink);
    slot.appendChild(logoutBtn);
    nav.appendChild(slot);

    function renderNav() {
      var user = state.user;
      var cache = readJSON('haggly-pro-entitlement-cache-v1') || {};
      var isPro = Boolean(cache.is_pro);
      status.textContent = user ? (isPro ? t('auth_nav_status_pro', 'Pro active') : t('auth_nav_status_signed_in', 'Signed in')) : '';
      loginLink.hidden = !!user;
      accountLink.hidden = !user;
      logoutBtn.hidden = !user;
      proLink.hidden = !!isPro;
      loginLink.textContent = t('auth_nav_login', 'Log In');
      proLink.textContent = t('auth_nav_go_pro', 'Go Pro');
      accountLink.textContent = t('auth_nav_account', 'Account');
      logoutBtn.textContent = t('auth_nav_logout', 'Log Out');
    }

    document.addEventListener('haggly-auth-ready', renderNav);
    document.addEventListener('haggly-auth-changed', renderNav);
    document.addEventListener('haggly-pro-updated', renderNav);
    document.addEventListener('haggly-lang-change', renderNav);
    renderNav();
  }

  window.hagglyAuth = {
    getPublicConfig: getPublicConfig,
    getClient: getClient,
    getState: function() { return Object.assign({}, state); },
    getAccessToken: getAccessToken,
    signInWithMagicLink: signInWithMagicLink,
    signOut: signOut,
    fetchProStatus: fetchProStatus,
    callAuthedJson: callAuthedJson,
    decorateNav: decorateNav,
    getLastEmail: function() { return readJSON('haggly-auth-last-email'); }
  };

  getClient().catch(function(err) {
    emit('haggly-auth-error', { message: err.message || 'Auth init failed' });
  });
})();
