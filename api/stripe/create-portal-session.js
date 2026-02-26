const { json, methodNotAllowed } = require('../_lib/env');
const { requireUser } = require('../_lib/auth');
const { createServiceSupabase } = require('../_lib/supabase');
const { getStripe } = require('../_lib/stripe');

function publicPortalErrorMessage(err) {
  if (err && err.statusCode === 401) return 'Sign in required';
  return 'Billing portal is temporarily unavailable. Please try again shortly.';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const user = await requireUser(req);
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return json(res, 400, { error: 'No Stripe customer found for this account' });
    }

    const stripe = getStripe();
    const siteUrl = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const params = {
      customer: data.stripe_customer_id,
      return_url: `${siteUrl}/account.html`
    };
    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
      params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }
    const session = await stripe.billingPortal.sessions.create(params);
    json(res, 200, { portal_url: session.url });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    json(res, statusCode, { error: publicPortalErrorMessage(err) });
  }
};
