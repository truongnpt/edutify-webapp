'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateQuestionGroupSchema,
  AssignQuestionGroupSchema,
  DeleteQuestionGroupSchema,
  UpdateQuestionGroupSchema,
  type CreateQuestionGroupInput,
  type UpdateQuestionGroupInput,
} from './schemas/group.schema';

function bankPath(bankId: string) {
  return `/home/questions/${bankId}`;
}

export async function loadQuestionGroupsForBank(userId: string, bankId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questions', 'read');

  const client = getSupabaseServerClient();

  const { data: groups, error } = await client
    .from('question_groups')
    .select(
      `
      id,
      title,
      group_type,
      shared_content,
      resource_url,
      sort_order,
      created_at,
      questions:questions(count)
    `,
    )
    .eq('bank_id', bankId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('sort_order')
    .order('title');

  if (error) throw error;

  const { data: groupedQuestions } = await client
    .from('questions')
    .select('id, content, question_type, question_group_id, status')
    .eq('bank_id', bankId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .not('question_group_id', 'is', null);

  return {
    context: ctx,
    groups: (groups ?? []).map((g) => ({
      ...g,
      question_count: g.questions?.[0]?.count ?? 0,
    })),
    groupedQuestions: groupedQuestions ?? [],
  };
}

export const createQuestionGroupAction = enhanceAction(
  async (data: CreateQuestionGroupInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'create');

    const client = getSupabaseServerClient();

    const { count } = await client
      .from('question_groups')
      .select('id', { count: 'exact', head: true })
      .eq('bank_id', data.bankId)
      .is('deleted_at', null);

    const { data: group, error } = await client
      .from('question_groups')
      .insert({
        organization_id: ctx.organization.id,
        bank_id: data.bankId,
        title: data.title,
        group_type: data.groupType,
        shared_content: data.sharedContent ?? null,
        resource_url: data.resourceUrl ?? null,
        sort_order: count ?? 0,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath(bankPath(data.bankId));

    return { success: true, id: group.id };
  },
  { schema: CreateQuestionGroupSchema },
);

export const updateQuestionGroupAction = enhanceAction(
  async (data: UpdateQuestionGroupInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('question_groups')
      .update({
        title: data.title,
        group_type: data.groupType,
        shared_content: data.sharedContent ?? null,
        resource_url: data.resourceUrl ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) throw error;

    revalidatePath(bankPath(data.bankId));

    return { success: true };
  },
  { schema: UpdateQuestionGroupSchema },
);

export const deleteQuestionGroupAction = enhanceAction(
  async (data: { id: string; bankId: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'delete');

    const client = getSupabaseServerClient();

    await client
      .from('questions')
      .update({ question_group_id: null })
      .eq('question_group_id', data.id)
      .eq('organization_id', ctx.organization.id);

    await softDeleteOrgRow(
      client,
      'question_groups',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(bankPath(data.bankId));

    return { success: true };
  },
  { schema: DeleteQuestionGroupSchema },
);

export const assignQuestionToGroupAction = enhanceAction(
  async (
    data: { questionId: string; bankId: string; groupId: string | null },
    user,
  ) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'update');

    const client = getSupabaseServerClient();

    if (data.groupId) {
      const { data: group } = await client
        .from('question_groups')
        .select('id')
        .eq('id', data.groupId)
        .eq('bank_id', data.bankId)
        .eq('organization_id', ctx.organization.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!group) {
        throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Question group not found');
      }
    }

    const { error } = await client
      .from('questions')
      .update({ question_group_id: data.groupId })
      .eq('id', data.questionId)
      .eq('bank_id', data.bankId)
      .eq('organization_id', ctx.organization.id);

    if (error) throw error;

    revalidatePath(bankPath(data.bankId));

    return { success: true };
  },
  { schema: AssignQuestionGroupSchema },
);
