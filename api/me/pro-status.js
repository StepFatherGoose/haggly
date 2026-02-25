const { json, methodNotAllowed } = require('../_lib/env');
const { requireUser } = require('../_lib/auth');
const { createServiceSupabase } = require('../_lib/supabase');
const { normalizeEntitlementRow } = require('../_lib/billing');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  try {
    const user = await requireUser(req);
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from('subscription_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    json(res, 200, {
      user: { id: user.id, email: user.email || null },
      ...normalizeEntitlementRow(data || null)
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    json(res, statusCode, { error: err.message || 'Failed to load Pro status' });
  }
};
