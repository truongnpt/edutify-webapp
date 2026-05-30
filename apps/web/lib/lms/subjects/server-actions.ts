'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateSubjectSchema,
  DeleteSubjectSchema,
  UpdateSubjectSchema,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from './schemas/subject.schema';

const TAXONOMY_PATH = '/home/taxonomy';

export async function loadSubjects(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questionBank', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('subjects')
    .select('id, name, code, description, created_at')
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;

  return { context: ctx, subjects: data ?? [] };
}

export const createSubjectAction = enhanceAction(
  async (data: CreateSubjectInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'create');

    const client = getSupabaseServerClient();

    const { error } = await client.from('subjects').insert({
      organization_id: ctx.organization.id,
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description ?? null,
      created_by: user.id,
    });

    if (error) {
      if (error.code === '23505') {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'Subject code already exists',
        );
      }

      throw error;
    }

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: CreateSubjectSchema },
);

export const updateSubjectAction = enhanceAction(
  async (data: UpdateSubjectInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('subjects')
      .update({
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) throw error;

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: UpdateSubjectSchema },
);

export const deleteSubjectAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRow(
      client,
      'subjects',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(TAXONOMY_PATH);

    return { success: true };
  },
  { schema: DeleteSubjectSchema },
);
