import 'server-only';

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function resolveStripePriceId(
  planSlug: string,
  dbPriceId: string | null | undefined,
) {
  if (dbPriceId) {
    return dbPriceId;
  }

  const envKey =
    planSlug === 'pro' ? process.env.STRIPE_PRICE_PRO
    : planSlug === 'enterprise' ? process.env.STRIPE_PRICE_ENTERPRISE
    : undefined;

  return envKey ?? null;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return secret;
}
