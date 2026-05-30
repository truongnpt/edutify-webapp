import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/lib/database.types';

type Client = SupabaseClient<Database>;

export async function resolveStudentProfile(
  client: Client,
  params: {
    organizationId: string;
    userId: string;
    email: string;
    fullName: string;
    createdBy: string;
  },
  options?: { allowCreate?: boolean },
) {
  const { data: byUserId } = await client
    .from('students')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('user_id', params.userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (byUserId) {
    return byUserId.id;
  }

  const { data: linkedId, error: linkError } = await client.rpc(
    'link_student_account',
    {
      p_organization_id: params.organizationId,
      p_user_id: params.userId,
      p_email: params.email,
    },
  );

  if (linkError) {
    throw linkError;
  }

  if (linkedId) {
    return linkedId;
  }

  if (options?.allowCreate === false) {
    return null;
  }

  const { data: created, error } = await client
    .from('students')
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      full_name: params.fullName,
      email: params.email.toLowerCase(),
      status: 'active',
      created_by: params.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return created.id;
}

/** @deprecated Use resolveStudentProfile */
export async function ensureStudentProfile(
  client: Client,
  params: {
    organizationId: string;
    userId: string;
    email: string;
    fullName: string;
    createdBy: string;
  },
) {
  return resolveStudentProfile(client, params);
}
