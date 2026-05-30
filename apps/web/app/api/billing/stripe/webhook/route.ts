import Stripe from 'stripe';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getStripeClient,
  getStripeWebhookSecret,
} from '~/lib/lms/billing/stripe-client';
import { stripeAmountToBillingAmount } from '~/lib/lms/billing/format-currency';

export const runtime = 'nodejs';

async function activateStripeSubscription(params: {
  organizationId: string;
  planId: string;
  userId: string | null;
  amount: number;
  sessionId: string;
  subscriptionId: string | null;
}) {
  const admin = getSupabaseServerAdminClient();

  const { data: existing } = await admin
    .from('payments')
    .select('id')
    .eq('stripe_checkout_session_id', params.sessionId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error: paymentError } = await admin.from('payments').insert({
    organization_id: params.organizationId,
    plan_id: params.planId,
    amount: params.amount,
    status: 'approved',
    payment_method: 'stripe',
    proof_image_url: null,
    stripe_checkout_session_id: params.sessionId,
    stripe_subscription_id: params.subscriptionId,
    created_by: params.userId,
    reviewed_at: new Date().toISOString(),
  });

  if (paymentError) {
    throw paymentError;
  }

  const { error: activateError } = await admin.rpc('activate_organization_plan', {
    p_organization_id: params.organizationId,
    p_plan_id: params.planId,
    p_activated_by: params.userId,
  });

  if (activateError) {
    throw activateError;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id;
  const planId = session.metadata?.plan_id;
  const userId = session.metadata?.user_id ?? null;

  if (!organizationId || !planId || !session.id) {
    return;
  }

  const amount = stripeAmountToBillingAmount(
    session.amount_total,
    session.currency,
  );

  await activateStripeSubscription({
    organizationId,
    planId,
    userId,
    amount,
    sessionId: session.id,
    subscriptionId:
      typeof session.subscription === 'string' ? session.subscription : null,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organization_id;

  if (!organizationId) {
    return;
  }

  const admin = getSupabaseServerAdminClient();

  const { data: freePlan } = await admin
    .from('plans')
    .select('id')
    .eq('slug', 'free')
    .single();

  if (!freePlan) {
    return;
  }

  await admin.rpc('activate_organization_plan', {
    p_organization_id: organizationId,
    p_plan_id: freePlan.id,
    p_activated_by: null,
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe webhook]', error);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
