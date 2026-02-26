const { json, methodNotAllowed, requireEnv } = require('../_lib/env');
const { requireUser } = require('../_lib/auth');
const { createServiceSupabase } = require('../_lib/supabase');
const { getStripe } = require('../_lib/stripe');

const BLOCKING_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid', 'paused']);

function proEnabled() {
  return (process.env.HAGGLY_PRO_ENABLED || 'true').toLowerCase() !== 'false';
}

function fail(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = true;
  return err;
}

async function hasBlockingSubscription({ supabase, stripe, userId, customerId, priceId }) {
  const { data: entitlement, error: entitlementError } = await supabase
    .from('subscription_entitlements')
    .select('is_pro, subscription_status')
    .eq('user_id', userId)
    .maybeSingle();
  if (entitlementError) throw entitlementError;

  if (entitlement && (entitlement.is_pro || BLOCKING_SUBSCRIPTION_STATUSES.has(String(entitlement.subscription_status || '')))) {
    return true;
  }

  if (!customerId) return false;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10
  });

  return (subscriptions.data || []).some((subscription) => {
    if (!BLOCKING_SUBSCRIPTION_STATUSES.has(String(subscription.status || ''))) return false;
    const items = subscription.items && Array.isArray(subscription.items.data) ? subscription.items.data : [];
    return items.some((item) => item && item.price && item.price.id === priceId);
  });
}

function publicCheckoutErrorMessage(err) {
  if (err && err.expose) return err.message;
  return 'Checkout is temporarily unavailable. Please try again shortly.';
}

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
    if (!proEnabled()) {
      throw fail(503, 'Pro subscriptions are temporarily unavailable right now.');
    }

    const user = await requireUser(req);
    const stripe = getStripe();
    const supabase = createServiceSupabase();
    const customerId = await getOrCreateStripeCustomer({ supabase, stripe, user });
    const priceId = requireEnv('STRIPE_PRO_PRICE_ID');

    if (await hasBlockingSubscription({ supabase, stripe, userId: user.id, customerId, priceId })) {
      throw fail(409, 'This account already has an active subscription. Use Manage Billing in Account.');
    }

    const siteUrl = process.env.SITE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const sessionParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
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
    json(res, statusCode, { error: publicCheckoutErrorMessage(err) });
  }
};
