'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';

import {
  LMS_ACTIVE_ORG_COOKIE,
  LMS_ACTIVE_ORG_MAX_AGE,
} from './active-org-cookie';

const SwitchOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});

export async function loadUserOrganizations(userId: string) {
  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('organization_members')
    .select(
      `
      role,
      organization:organizations (
        id,
        name,
        slug,
        logo_url
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.organization && typeof row.organization === 'object')
    .map((row) => ({
      role: row.role,
      organization: row.organization as {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
      },
    }));
}

export const switchOrganizationAction = enhanceAction(
  async (data: z.infer<typeof SwitchOrganizationSchema>, user) => {
    const client = getSupabaseServerClient();

    const { data: membership, error } = await client
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', data.organizationId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !membership) {
      throw new LmsError(
        LMS_ERROR_CODES.PERMISSION_DENIED,
        'You are not a member of this organization',
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(LMS_ACTIVE_ORG_COOKIE, data.organizationId, {
      path: '/',
      maxAge: LMS_ACTIVE_ORG_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
    });

    revalidatePath('/home', 'layout');

    return { success: true };
  },
  { schema: SwitchOrganizationSchema },
);
