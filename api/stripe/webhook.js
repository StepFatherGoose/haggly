const { json, methodNotAllowed, requireEnv } = require('../_lib/env');
const { createServiceSupabase } = require('../_lib/supabase');
const { getStripe } = require('../_lib/stripe');
const { readRawBody } = require('../_lib/body');
const { stripeStatusIsPro, unixToIsoOrNull } = require('../_lib/billing');

async function markEventProcessed(supabase, event, status) {
  const { error } = await supabase.from('stripe_webhook_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    status: status || 'processed'
  });
  if (error) throw error;
}

async function hasProcessedEvent(supabase, eventId) {
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.stripe_event_id);
}

async function linkCustomerToUser(supabase, customerId, userId, email) {
  if (!customerId || !userId) return;
  const { error } = await supabase.from('billing_customers').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    email: email || null
  });
  if (error) throw error;
}

async function upsertEntitlementFromSubscription(supabase, subscription, stripeEventId) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  if (subscription.customer) {
    await linkCustomerToUser(supabase, String(subscription.customer), userId, null);
  }

  const status = subscription.status || 'unknown';
  const isPro = stripeStatusIsPro(status);
  const { error } = await supabase.from('subscription_entitlements').upsert({
    user_id: userId,
    plan_code: 'haggly_pro',
    is_pro: isPro,
    subscription_status: status,
    stripe_subscription_id: subscription.id,
    current_period_end: unixToIsoOrNull(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    last_stripe_event_id: stripeEventId
  });
  if (error) throw error;
}

async function handleEvent(supabase, event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id || session.subscription_data?.metadata?.supabase_user_id;
      if (session.customer && userId) {
        await linkCustomerToUser(supabase, String(session.customer), userId, session.customer_details?.email || null);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await upsertEntitlementFromSubscription(supabase, event.data.object, event.id);
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(String(invoice.subscription));
        await upsertEntitlementFromSubscription(supabase, subscription, event.id);
      }
      break;
    }
    default:
      break;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  let event;
  try {
    const stripe = getStripe();
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv('STRIPE_WEBHOOK_SECRET'));

    const supabase = createServiceSupabase();
    if (await hasProcessedEvent(supabase, event.id)) {
      return json(res, 200, { received: true, duplicate: true });
    }

    await handleEvent(supabase, event);
    await markEventProcessed(supabase, event, 'processed');

    json(res, 200, { received: true });
  } catch (err) {
    try {
      const supabase = createServiceSupabase();
      if (event && event.id) {
        await markEventProcessed(supabase, event, 'failed');
      }
    } catch (_) {}
    const statusCode = err.statusCode || 400;
    json(res, statusCode, { error: err.message || 'Webhook failed' });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
