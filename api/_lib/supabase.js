const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./env');

function createServiceSupabase() {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
}

function createAdminAuthClient() {
  return createServiceSupabase();
}

module.exports = { createServiceSupabase, createAdminAuthClient };
