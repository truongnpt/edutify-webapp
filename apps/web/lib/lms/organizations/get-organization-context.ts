import 'server-only';

import { cookies } from 'next/headers';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '../errors';
import type { OrganizationContext } from '../types';

import { LMS_ACTIVE_ORG_COOKIE } from './active-org-cookie';

export async function getOrganizationContext(
  userId: string,
): Promise<OrganizationContext> {
  const client = getSupabaseServerClient();
  const cookieStore = await cookies();
  const preferredOrgId = cookieStore.get(LMS_ACTIVE_ORG_COOKIE)?.value;

  let membershipQuery = client
    .from('organization_members')
    .select(
      `
      id,
      organization_id,
      user_id,
      role,
      status,
      organization:organizations (
        id,
        name,
        slug,
        logo_url,
        owner_id,
        created_at,
        updated_at
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (preferredOrgId) {
    membershipQuery = membershipQuery.eq('organization_id', preferredOrgId);
  } else {
    membershipQuery = membershipQuery
      .order('created_at', { ascending: true })
      .limit(1);
  }

  const { data: membership, error: memberError } =
    await membershipQuery.maybeSingle();

  if (memberError || !membership?.organization) {
    throw new LmsError(
      LMS_ERROR_CODES.ORGANIZATION_NOT_FOUND,
      'Organization not found for user',
    );
  }

  const organization = membership.organization as OrganizationContext['organization'];

  const { data: subscription } = await client
    .from('subscriptions')
    .select(
      `
      id,
      organization_id,
      plan_id,
      status,
      started_at,
      expired_at,
      plan:plans (
        id,
        name,
        slug,
        max_students,
        max_exams,
        max_questions,
        price_monthly
      )
    `,
    )
    .eq('organization_id', organization.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    organization,
    membership: {
      id: membership.id,
      organization_id: membership.organization_id,
      user_id: membership.user_id,
      role: membership.role,
      status: membership.status,
    },
    subscription: subscription ?? null,
    plan: (subscription?.plan as OrganizationContext['plan']) ?? null,
  };
}
