'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import appConfig from '~/config/app.config';
import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

import {
  getStripeClient,
  isStripeConfigured,
  resolveStripePriceId,
} from './stripe-client';
import { CreateStripeCheckoutSchema, CreateStripePortalSchema } from './schemas/stripe.schema';

const BILLING_PATH = '/home/billing';

export async function isStripeBillingEnabled() {
  return isStripeConfigured();
}

export const createStripePortalAction = enhanceAction(
  async (_data: Record<string, never>, user) => {
    if (!isStripeConfigured()) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Stripe billing is not configured',
      );
    }

    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'billing', 'read');

    const client = getSupabaseServerClient();
    const stripe = getStripeClient();

    const { data: orgRow, error: orgError } = await client
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', ctx.organization.id)
      .single();

    if (orgError || !orgRow?.stripe_customer_id) {
      throw new LmsError(
        LMS_ERROR_CODES.NOT_FOUND,
        'No Stripe subscription found for this organization',
      );
    }

    const siteUrl = appConfig.url.replace(/\/$/, '');

    const session = await stripe.billingPortal.sessions.create({
      customer: orgRow.stripe_customer_id,
      return_url: `${siteUrl}${BILLING_PATH}`,
    });

    if (!session.url) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Could not open Stripe customer portal',
      );
    }

    return { url: session.url };
  },
  { schema: CreateStripePortalSchema },
);

export const createStripeCheckoutAction = enhanceAction(
  async (data: { planSlug: 'pro' | 'enterprise' }, user) => {
    if (!isStripeConfigured()) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Stripe billing is not configured',
      );
    }

    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'billing', 'create');

    const client = getSupabaseServerClient();
    const stripe = getStripeClient();

    const { data: plan, error: planError } = await client
      .from('plans')
      .select('id, slug, price_monthly, stripe_price_id')
      .eq('slug', data.planSlug)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Plan not found');
    }

    const priceId = resolveStripePriceId(plan.slug, plan.stripe_price_id);

    if (!priceId) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Stripe price is not configured for this plan',
      );
    }

    if (ctx.plan?.slug === plan.slug) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'You are already on this plan',
      );
    }

    const { data: existingPending } = await client
      .from('payments')
      .select('id')
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'You already have a pending payment awaiting review',
      );
    }

    const { data: orgRow } = await client
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', ctx.organization.id)
      .single();

    let customerId = orgRow?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: ctx.organization.name,
        metadata: {
          organization_id: ctx.organization.id,
        },
      });

      customerId = customer.id;

      await client
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', ctx.organization.id);
    }

    const siteUrl = appConfig.url.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}${BILLING_PATH}?stripe=success`,
      cancel_url: `${siteUrl}${BILLING_PATH}?stripe=cancelled`,
      metadata: {
        organization_id: ctx.organization.id,
        plan_id: plan.id,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          organization_id: ctx.organization.id,
          plan_id: plan.id,
        },
      },
    });

    if (!session.url) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Could not create Stripe checkout session',
      );
    }

    revalidatePath(BILLING_PATH);

    return { url: session.url };
  },
  { schema: CreateStripeCheckoutSchema },
);
