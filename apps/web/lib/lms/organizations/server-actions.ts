'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { assertPermission } from '~/lib/lms/permissions/matrix';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import {
  UpdateOrganizationSchema,
  type UpdateOrganizationInput,
} from '~/lib/lms/organizations/schemas/update-organization.schema';

export const updateOrganizationAction = enhanceAction(
  async (data: UpdateOrganizationInput, user) => {
    const ctx = await getOrganizationContext(user.id);

    assertPermission(ctx.membership.role, 'organization', 'update');

    const client = getSupabaseServerClient();
    const logoUrl = data.logoUrl || null;

    const { error } = await client
      .from('organizations')
      .update({
        name: data.name,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.organization.id);

    if (error) {
      throw error;
    }

    await client.rpc('write_audit_log', {
      p_organization_id: ctx.organization.id,
      p_action: 'organization.updated',
      p_entity_type: 'organizations',
      p_entity_id: ctx.organization.id,
      p_old_data: {
        name: ctx.organization.name,
        logo_url: ctx.organization.logo_url,
      },
      p_new_data: { name: data.name, logo_url: logoUrl },
    });

    revalidatePath('/home/organization');

    return { success: true };
  },
  { schema: UpdateOrganizationSchema },
);

export async function loadOrganizationSettings(userId: string) {
  return getOrganizationContext(userId);
}
