'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

import {
  ApprovePaymentSchema,
  CreatePaymentSchema,
  RejectPaymentSchema,
  type CreatePaymentInput,
} from './schemas/payment.schema';

const BILLING_PATH = '/home/billing';
const ADMIN_PAYMENTS_PATH = '/home/admin/payments';
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function isPlatformAdminClient() {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('is_platform_admin');

  if (error) return false;

  return Boolean(data);
}

export async function uploadPaymentProof(formData: FormData) {
  const client = getSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new LmsError(LMS_ERROR_CODES.PERMISSION_DENIED, 'Not authenticated');
  }

  const ctx = await getOrganizationContext(user.id);
  assertPermission(ctx.membership.role, 'billing', 'create');

  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new LmsError(LMS_ERROR_CODES.VALIDATION_ERROR, 'No file provided');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new LmsError(
      LMS_ERROR_CODES.VALIDATION_ERROR,
      'Only JPG, PNG, or WebP images are allowed',
    );
  }

  if (file.size > MAX_PROOF_SIZE) {
    throw new LmsError(LMS_ERROR_CODES.VALIDATION_ERROR, 'File must be under 5MB');
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const path = `${ctx.organization.id}/${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error } = await client.storage
    .from('payment_proofs')
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) {
    throw new LmsError(
      LMS_ERROR_CODES.VALIDATION_ERROR,
      error.message ?? 'Upload failed',
    );
  }

  return { path };
}

export async function loadBilling(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'billing', 'read');

  const client = getSupabaseServerClient();

  const [{ data: plans }, { data: payments }, { data: orgRow }] = await Promise.all([
    client
      .from('plans')
      .select(
        'id, name, slug, price_monthly, max_students, max_exams, max_questions, stripe_price_id',
      )
      .eq('is_active', true)
      .neq('slug', 'free')
      .order('price_monthly'),
    client
      .from('payments')
      .select(
        'id, amount, status, proof_image_url, payment_method, created_at, reviewed_at, rejection_reason, plan:plans(name, slug)',
      )
      .eq('organization_id', ctx.organization.id)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', ctx.organization.id)
      .single(),
  ]);

  return {
    context: ctx,
    upgradePlans: plans ?? [],
    payments: payments ?? [],
    stripeCustomerId: orgRow?.stripe_customer_id ?? null,
  };
}

export async function loadPendingPayments(userId: string) {
  const admin = await isPlatformAdminClient();

  if (!admin) {
    throw new LmsError(
      LMS_ERROR_CODES.PERMISSION_DENIED,
      'Platform admin access required',
    );
  }

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('payments')
    .select(
      `
      id,
      amount,
      status,
      proof_image_url,
      created_at,
      organization:organizations (name),
      plan:plans (name, slug)
    `,
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return {
    payments: (data ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      proofImagePath: payment.proof_image_url,
      createdAt: payment.created_at,
      organizationName:
        payment.organization && typeof payment.organization === 'object' ?
          (payment.organization as { name: string }).name
        : '—',
      planName:
        payment.plan && typeof payment.plan === 'object' ?
          (payment.plan as { name: string }).name
        : '—',
    })),
  };
}

export const createPaymentAction = enhanceAction(
  async (data: CreatePaymentInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'billing', 'create');

    const client = getSupabaseServerClient();

    const { data: plan, error: planError } = await client
      .from('plans')
      .select('id, price_monthly, slug')
      .eq('slug', data.planSlug)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Plan not found');
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

    const { error } = await client.from('payments').insert({
      organization_id: ctx.organization.id,
      plan_id: plan.id,
      amount: plan.price_monthly,
      status: 'pending',
      proof_image_url: data.proofImagePath,
      created_by: user.id,
    });

    if (error) throw error;

    revalidatePath(BILLING_PATH);
    revalidatePath(ADMIN_PAYMENTS_PATH);

    return { success: true };
  },
  { schema: CreatePaymentSchema },
);

export const approvePaymentAction = enhanceAction(
  async (data: { paymentId: string }) => {
    const admin = await isPlatformAdminClient();

    if (!admin) {
      throw new LmsError(
        LMS_ERROR_CODES.PERMISSION_DENIED,
        'Platform admin access required',
      );
    }

    const client = getSupabaseServerClient();

    const { error } = await client.rpc('approve_payment', {
      p_payment_id: data.paymentId,
    });

    if (error) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        error.message ?? 'Failed to approve payment',
      );
    }

    revalidatePath(BILLING_PATH);
    revalidatePath(ADMIN_PAYMENTS_PATH);
    revalidatePath('/home/organization');

    return { success: true };
  },
  { schema: ApprovePaymentSchema },
);

export const rejectPaymentAction = enhanceAction(
  async (data: { paymentId: string; reason?: string }) => {
    const admin = await isPlatformAdminClient();

    if (!admin) {
      throw new LmsError(
        LMS_ERROR_CODES.PERMISSION_DENIED,
        'Platform admin access required',
      );
    }

    const client = getSupabaseServerClient();

    const { error } = await client.rpc('reject_payment', {
      p_payment_id: data.paymentId,
      p_reason: data.reason ?? undefined,
    });

    if (error) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        error.message ?? 'Failed to reject payment',
      );
    }

    revalidatePath(BILLING_PATH);
    revalidatePath(ADMIN_PAYMENTS_PATH);

    return { success: true };
  },
  { schema: RejectPaymentSchema },
);

export async function getPaymentProofSignedUrl(storagePath: string) {
  const client = getSupabaseServerClient();

  const { data, error } = await client.storage
    .from('payment_proofs')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Could not load proof image');
  }

  return data.signedUrl;
}
