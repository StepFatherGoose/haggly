const Stripe = require('stripe');
const { requireEnv } = require('./env');

let stripe;

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  }
  return stripe;
}

module.exports = { getStripe };
