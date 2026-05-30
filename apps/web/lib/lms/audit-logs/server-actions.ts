'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

export async function loadAuditLogs(userId: string, limit = 100) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'organization', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('audit_logs')
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      created_at,
      user_id
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return {
    context: ctx,
    logs: data ?? [],
  };
}
