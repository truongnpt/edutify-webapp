'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Json } from '~/lib/database.types';

import type { AssessmentQuestionType } from '~/lib/lms/assessment/question-types';
import {
  buildAnswerSchemaFromOptions,
  buildMatchingSchema,
  buildOrderingSchema,
} from '~/lib/lms/assessment/answer-schema';
import { getDefaultGradingMode } from '~/lib/lms/assessment/question-types';
import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import {
  softDeleteOrgRow,
  softDeleteOrgRowsByColumn,
} from '~/lib/lms/soft-delete';
import {
  CreateQuestionBankSchema,
  DeleteQuestionBankSchema,
  UpdateQuestionBankSchema,
  type CreateQuestionBankInput,
  type DeleteQuestionBankInput,
  type UpdateQuestionBankInput,
} from '~/lib/lms/questions/schemas/question-bank.schema';
import {
  CreateQuestionSchema,
  DeleteQuestionSchema,
  UpdateQuestionSchema,
  UpdateQuestionStatusSchema,
  type CreateQuestionInput,
  type DeleteQuestionInput,
  type UpdateQuestionInput,
} from '~/lib/lms/questions/schemas/question.schema';
import {
  buildQuestionMetadata,
  buildQuestionScoringSchema,
} from '~/lib/lms/questions/question-form-utils';

export async function loadQuestionBanks(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questionBank', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('question_banks')
    .select(
      `
      id,
      organization_id,
      name,
      description,
      created_at,
      updated_at,
      questions:questions(count)
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return {
    context: ctx,
    banks: (data ?? []).map((bank) => ({
      ...bank,
      question_count: bank.questions?.[0]?.count ?? 0,
    })),
  };
}

export async function loadQuestionBankDetail(userId: string, bankId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'questions', 'read');

  const client = getSupabaseServerClient();

  const { data: bank, error: bankError } = await client
    .from('question_banks')
    .select('*')
    .eq('id', bankId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .single();

  if (bankError || !bank) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Question bank not found');
  }

  const { data: questions, error: questionsError } = await client
    .from('questions')
    .select(
      `
      id,
      organization_id,
      bank_id,
      question_type,
      title,
      content,
      explanation,
      difficulty,
      answer_schema,
      scoring_schema,
      metadata,
      status,
      grading_mode,
      question_group_id,
      created_at,
      updated_at,
      options:question_options (
        id,
        question_id,
        content,
        is_correct,
        sort_order
      ),
      question_tags:question_tags (
        tag_id,
        tag:tags (id, name)
      )
    `,
    )
    .eq('bank_id', bankId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (questionsError) {
    throw questionsError;
  }

  return {
    context: ctx,
    bank,
    questions: (questions ?? []).map((q) => ({
      ...q,
      type: q.question_type,
      options: (q.options ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
      tags: (q.question_tags ?? [])
        .map((qt) =>
          qt.tag && typeof qt.tag === 'object' ?
            (qt.tag as { id: string; name: string })
          : null,
        )
        .filter(Boolean),
    })),
  };
}

export const createQuestionBankAction = enhanceAction(
  async (data: CreateQuestionBankInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'create');

    const client = getSupabaseServerClient();

    const { data: bank, error } = await client
      .from('question_banks')
      .insert({
        organization_id: ctx.organization.id,
        name: data.name,
        description: data.description ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    await client.rpc('write_audit_log', {
      p_organization_id: ctx.organization.id,
      p_action: 'question_bank.created',
      p_entity_type: 'question_banks',
      p_entity_id: bank.id,
      p_new_data: { name: data.name },
    });

    revalidatePath('/home/questions');

    return { success: true, id: bank.id };
  },
  { schema: CreateQuestionBankSchema },
);

export const updateQuestionBankAction = enhanceAction(
  async (data: UpdateQuestionBankInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('question_banks')
      .update({
        name: data.name,
        description: data.description ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    revalidatePath('/home/questions');
    revalidatePath(`/home/questions/${data.id}`);

    return { success: true };
  },
  { schema: UpdateQuestionBankSchema },
);

export const deleteQuestionBankAction = enhanceAction(
  async (data: DeleteQuestionBankInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questionBank', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRowsByColumn(
      client,
      { table: 'questions', column: 'bank_id' },
      data.id,
      ctx.organization.id,
    );

    await softDeleteOrgRow(
      client,
      'question_banks',
      data.id,
      ctx.organization.id,
    );

    revalidatePath('/home/questions');

    return { success: true };
  },
  { schema: DeleteQuestionBankSchema },
);

const MATCHING_TYPES = [
  'matching_pairs',
  'matching_headings',
  'matching_features',
  'matching_information',
  'image_labeling',
  'diagram_labeling',
  'map_labeling',
] as const;

const ORDERING_TYPES = ['sequence_order', 'drag_drop_order'] as const;

function resolveAnswerSchema(
  data: CreateQuestionInput | UpdateQuestionInput,
): Record<string, unknown> {
  const questionType = data.type as AssessmentQuestionType;

  if (
    MATCHING_TYPES.includes(questionType as (typeof MATCHING_TYPES)[number]) &&
    data.matchingPairs?.length
  ) {
    return buildMatchingSchema(data.matchingPairs) as unknown as Record<
      string,
      unknown
    >;
  }

  if (
    ORDERING_TYPES.includes(questionType as (typeof ORDERING_TYPES)[number]) &&
    data.orderingItems?.length
  ) {
    return buildOrderingSchema(data.orderingItems) as unknown as Record<
      string,
      unknown
    >;
  }

  if (data.options?.length) {
    return buildAnswerSchemaFromOptions(
      questionType,
      data.options,
    ) as unknown as Record<string, unknown>;
  }

  return {};
}

function usesQuestionOptionsTable(type: AssessmentQuestionType) {
  return (
    !MATCHING_TYPES.includes(type as (typeof MATCHING_TYPES)[number]) &&
    !ORDERING_TYPES.includes(type as (typeof ORDERING_TYPES)[number]) &&
    type !== 'essay' &&
    type !== 'paragraph_answer' &&
    type !== 'file_upload' &&
    type !== 'audio_response' &&
    type !== 'coding' &&
    type !== 'spreadsheet_task'
  );
}

async function syncQuestionTags(
  organizationId: string,
  questionId: string,
  tagIds: string[] | undefined,
) {
  const client = getSupabaseServerClient();

  await client
    .from('question_tags')
    .delete()
    .eq('question_id', questionId)
    .eq('organization_id', organizationId);

  if (!tagIds?.length) return;

  const { error } = await client.from('question_tags').insert(
    tagIds.map((tagId) => ({
      organization_id: organizationId,
      question_id: questionId,
      tag_id: tagId,
    })),
  );

  if (error) throw error;
}

async function upsertQuestionOptions(
  organizationId: string,
  questionId: string,
  userId: string,
  options: NonNullable<CreateQuestionInput['options']>,
) {
  const client = getSupabaseServerClient();

  await softDeleteOrgRowsByColumn(
    client,
    { table: 'question_options', column: 'question_id' },
    questionId,
    organizationId,
  );

  if (options.length === 0) {
    return;
  }

  const { error } = await client.from('question_options').insert(
    options.map((option, index) => ({
      organization_id: organizationId,
      question_id: questionId,
      content: option.content,
      is_correct: option.isCorrect,
      sort_order: option.sortOrder ?? index,
      created_by: userId,
    })),
  );

  if (error) {
    throw error;
  }
}

export const createQuestionAction = enhanceAction(
  async (data: CreateQuestionInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'create');

    const client = getSupabaseServerClient();

    const { data: quotaOk, error: quotaError } = await client.rpc(
      'check_question_quota',
      { p_organization_id: ctx.organization.id },
    );

    if (quotaError) {
      throw quotaError;
    }

    if (!quotaOk) {
      throw new LmsError(
        LMS_ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        'Question limit reached for current plan',
      );
    }

    const questionType = data.type as AssessmentQuestionType;
    const answerSchema = resolveAnswerSchema(data);
    const scoringSchema = buildQuestionScoringSchema(data);
    const gradingMode = getDefaultGradingMode(questionType);
    const metadata = buildQuestionMetadata(data);

    const { data: question, error } = await client
      .from('questions')
      .insert({
        organization_id: ctx.organization.id,
        bank_id: data.bankId,
        question_type: questionType,
        title: data.title ?? data.content.slice(0, 200),
        content: data.content,
        explanation: data.explanation ?? null,
        difficulty: data.difficulty,
        metadata: metadata as Json,
        answer_schema: answerSchema as Json,
        scoring_schema: scoringSchema as Json,
        grading_mode: gradingMode,
        status: 'draft',
        question_group_id: data.questionGroupId ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    if (data.options?.length && usesQuestionOptionsTable(questionType)) {
      await upsertQuestionOptions(
        ctx.organization.id,
        question.id,
        user.id,
        data.options,
      );
    }

    await syncQuestionTags(ctx.organization.id, question.id, data.tagIds);

    revalidatePath(`/home/questions/${data.bankId}`);

    return { success: true, id: question.id };
  },
  { schema: CreateQuestionSchema },
);

export const updateQuestionAction = enhanceAction(
  async (data: UpdateQuestionInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'update');

    const client = getSupabaseServerClient();

    const { data: existing, error: fetchError } = await client
      .from('questions')
      .select('bank_id')
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Question not found');
    }

    const questionType = data.type as AssessmentQuestionType;
    const answerSchema = resolveAnswerSchema(data);
    const metadata = buildQuestionMetadata(data);
    const scoringSchema = buildQuestionScoringSchema(data);

    const { error } = await client
      .from('questions')
      .update({
        question_type: questionType,
        title: data.title ?? data.content.slice(0, 200),
        content: data.content,
        explanation: data.explanation ?? null,
        difficulty: data.difficulty,
        metadata: metadata as Json,
        answer_schema: answerSchema as Json,
        scoring_schema: scoringSchema as Json,
        grading_mode: getDefaultGradingMode(questionType),
        question_group_id: data.questionGroupId ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    if (usesQuestionOptionsTable(questionType)) {
      if (data.options) {
        await upsertQuestionOptions(
          ctx.organization.id,
          data.id,
          user.id,
          data.options,
        );
      }
    } else {
      await softDeleteOrgRowsByColumn(
        client,
        { table: 'question_options', column: 'question_id' },
        data.id,
        ctx.organization.id,
      );
    }

    await syncQuestionTags(ctx.organization.id, data.id, data.tagIds);

    revalidatePath(`/home/questions/${existing.bank_id}`);

    return { success: true };
  },
  { schema: UpdateQuestionSchema },
);

export const deleteQuestionAction = enhanceAction(
  async (data: DeleteQuestionInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'delete');

    const client = getSupabaseServerClient();

    const { data: existing, error: fetchError } = await client
      .from('questions')
      .select('bank_id')
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Question not found');
    }

    await softDeleteOrgRowsByColumn(
      client,
      { table: 'question_options', column: 'question_id' },
      data.id,
      ctx.organization.id,
    );

    await softDeleteOrgRow(
      client,
      'questions',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(`/home/questions/${existing.bank_id}`);

    return { success: true };
  },
  { schema: DeleteQuestionSchema },
);

export const updateQuestionStatusAction = enhanceAction(
  async (data: { id: string; status: 'draft' | 'published' | 'archived' }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'update');

    const client = getSupabaseServerClient();

    const { data: existing, error: fetchError } = await client
      .from('questions')
      .select('bank_id, content')
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Question not found');
    }

    if (data.status === 'published' && !existing.content?.trim()) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Question must have content before publishing',
      );
    }

    const { error } = await client
      .from('questions')
      .update({ status: data.status })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    revalidatePath(`/home/questions/${existing.bank_id}`);

    return { success: true };
  },
  { schema: UpdateQuestionStatusSchema },
);
