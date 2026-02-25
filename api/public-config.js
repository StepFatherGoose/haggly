const { json, methodNotAllowed } = require('./_lib/env');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  json(res, 200, {
    pro_enabled: process.env.HAGGLY_PRO_ENABLED !== 'false',
    site_url: process.env.SITE_URL || '',
    supabase_url: process.env.SUPABASE_URL || '',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || ''
  });
};
