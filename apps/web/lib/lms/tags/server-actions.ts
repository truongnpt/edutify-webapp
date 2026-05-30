'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { loadSubjects } from '~/lib/lms/subjects/server-actions';
import { loadTopics } from '~/lib/lms/topics/server-actions';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateTagSchema,
  DeleteTagSchema,
  UpdateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from './schemas/tag.schema';

const TAXONOMY_PATH = '/home/taxonomy';

export async function loadTags(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questionBank', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('tags')
    .select('id, name, created_at')
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;

  return { context: ctx, tags: data ?? [] };
}

export async function loadTaxonomy(userId: string) {
  const [subjectsResult, tagsResult, topicsResult] = await Promise.all([
    loadSubjects(userId),
    loadTags(userId),
    loadTopics(userId),
  ]);

  return {
    context: subjectsResult.context,
    subjects: subjectsResult.subjects,
    tags: tagsResult.tags,
    topics: topicsResult.topics,
  };
}

export const createTagAction = enhanceAction(
  async (data: CreateTagInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'create');

    const client = getSupabaseServerClient();

    const { error } = await client.from('tags').insert({
      organization_id: ctx.organization.id,
      name: data.name.trim(),
      created_by: user.id,
    });

    if (error) {
      if (error.code === '23505') {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'Tag name already exists',
        );
      }

      throw error;
    }

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: CreateTagSchema },
);

export const updateTagAction = enhanceAction(
  async (data: UpdateTagInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('tags')
      .update({ name: data.name.trim() })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) throw error;

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: UpdateTagSchema },
);

export const deleteTagAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRow(client, 'tags', data.id, ctx.organization.id);

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: DeleteTagSchema },
);
