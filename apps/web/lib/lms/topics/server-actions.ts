'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateTopicSchema,
  DeleteTopicSchema,
  UpdateTopicSchema,
  type CreateTopicInput,
  type UpdateTopicInput,
} from './schemas/topic.schema';

const TAXONOMY_PATH = '/home/taxonomy';

export async function loadTopics(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questionBank', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('topics')
    .select('id, subject_id, parent_id, name, created_at')
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;

  return { context: ctx, topics: data ?? [] };
}

export const createTopicAction = enhanceAction(
  async (data: CreateTopicInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'create');

    const client = getSupabaseServerClient();

    const { error } = await client.from('topics').insert({
      organization_id: ctx.organization.id,
      subject_id: data.subjectId,
      parent_id: data.parentId ?? null,
      name: data.name.trim(),
      created_by: user.id,
    });

    if (error) throw error;

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: CreateTopicSchema },
);

export const updateTopicAction = enhanceAction(
  async (data: UpdateTopicInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('topics')
      .update({ name: data.name.trim() })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) throw error;

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: UpdateTopicSchema },
);

export const deleteTopicAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRow(client, 'topics', data.id, ctx.organization.id);

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: DeleteTopicSchema },
);
