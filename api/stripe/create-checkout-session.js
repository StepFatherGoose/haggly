const { json, methodNotAllowed, requireEnv } = require('../_lib/env');
const { requireUser } = require('../_lib/auth');
const { createServiceSupabase } = require('../_lib/supabase');
const { getStripe } = require('../_lib/stripe');

async function getOrCreateStripeCustomer({ supabase, stripe, user }) {
  const { data: existing, error: fetchError } = await supabase
    .from('billing_customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: { supabase_user_id: user.id }
  });

  const { error: upsertError } = await supabase.from('billing_customers').upsert({
    user_id: user.id,
    stripe_customer_id: customer.id,
    email: user.email || null
  });
  if (upsertError) throw upsertError;

  return customer.id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  try {
    const user = await requireUser(req);
    const stripe = getStripe();
    const supabase = createServiceSupabase();
    const customerId = await getOrCreateStripeCustomer({ supabase, stripe, user });

    const siteUrl = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const sessionParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: requireEnv('STRIPE_PRO_PRICE_ID'), quantity: 1 }],
      success_url: `${siteUrl}/account.html?checkout=success`,
      cancel_url: `${siteUrl}/pro.html?checkout=cancelled`,
      customer_update: { address: 'auto' },
      automatic_tax: { enabled: true },
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id }
      }
    };

    if ((process.env.STRIPE_ENABLE_ADAPTIVE_PRICING || '').toLowerCase() === 'true') {
      sessionParams.adaptive_pricing = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    json(res, 200, { checkout_url: session.url });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    json(res, statusCode, { error: err.message || 'Failed to create checkout session' });
  }
};
