function stripeStatusIsPro(status) {
  return ['trialing', 'active'].includes(status);
}

function unixToIsoOrNull(seconds) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function normalizeEntitlementRow(row) {
  return {
    is_pro: Boolean(row?.is_pro),
    plan_code: row?.plan_code || 'haggly_pro',
    subscription_status: row?.subscription_status || 'none',
    cancel_at_period_end: Boolean(row?.cancel_at_period_end),
    current_period_end: row?.current_period_end || null,
    features: {
      ad_free: Boolean(row?.is_pro),
      custom_phrase: Boolean(row?.is_pro),
      recent_phrases: Boolean(row?.is_pro),
      premium_actions: Boolean(row?.is_pro),
      premium_tones: Boolean(row?.is_pro)
    }
  };
}

module.exports = { stripeStatusIsPro, unixToIsoOrNull, normalizeEntitlementRow };
