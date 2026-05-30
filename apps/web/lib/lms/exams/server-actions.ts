'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

import type { Json } from '~/lib/database.types';
import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import {
  softDeleteOrgRow,
  softDeleteOrgRowsByColumn,
} from '~/lib/lms/soft-delete';
import { ensureStudentProfile } from '~/lib/lms/students/ensure-student-profile';

import {
  AddSectionItemSchema,
  CreateExamSchema,
  CreateQuestionGroupSchema,
  CreateSectionSchema,
  DeleteExamSchema,
  DeleteSectionSchema,
  PublishExamSchema,
  RemoveSectionItemSchema,
  ReorderSectionItemsSchema,
  ReorderSectionsSchema,
  UpdateExamSchema,
  UpdateExamStatusSchema,
  UpdateSectionSchema,
  type AddSectionItemInput,
  type CreateExamInput,
  type CreateQuestionGroupInput,
  type CreateSectionInput,
  type UpdateExamInput,
  type UpdateSectionInput,
} from './schemas/exam.schema';

function examPath(examId: string) {
  return `/home/exams/${examId}`;
}

export async function loadExams(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'exams', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('exams')
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      pass_score,
      total_score,
      status,
      created_at,
      updated_at,
      subject:subjects (id, name, code),
      sections:exam_sections(count)
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
    exams: (data ?? []).map((exam) => ({
      ...exam,
      section_count: exam.sections?.[0]?.count ?? 0,
    })),
  };
}

export async function loadExamBuilder(userId: string, examId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'exams', 'read');

  const client = getSupabaseServerClient();

  const { data: exam, error: examError } = await client
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .single();

  if (examError || !exam) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Exam not found');
  }

  const { data: sections, error: sectionsError } = await client
    .from('exam_sections')
    .select(
      `
      id,
      title,
      description,
      sort_order,
      duration_minutes,
      items:exam_section_items (
        id,
        question_id,
        question_group_id,
        score,
        sort_order,
        question:questions (
          id,
          title,
          content,
          question_type,
          difficulty
        ),
        question_group:question_groups (
          id,
          title,
          group_type,
          shared_content
        )
      )
    `,
    )
    .eq('exam_id', examId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (sectionsError) {
    throw sectionsError;
  }

  const { data: banks } = await client
    .from('question_banks')
    .select('id, name')
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('name');

  const { data: questions } = await client
    .from('questions')
    .select('id, title, content, question_type, bank_id, question_group_id')
    .eq('organization_id', ctx.organization.id)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: groups } = await client
    .from('question_groups')
    .select(
      `
      id,
      title,
      group_type,
      bank_id,
      questions:questions(count)
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('title');

  const { data: subjects } = await client
    .from('subjects')
    .select('id, name, code')
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('name');

  return {
    context: ctx,
    exam,
    sections: (sections ?? []).map((section) => ({
      ...section,
      items: (section.items ?? [])
        .filter((item) => !('deleted_at' in item))
        .sort((a, b) => a.sort_order - b.sort_order),
    })),
    banks: banks ?? [],
    availableQuestions: questions ?? [],
    questionGroups: (groups ?? []).map((g) => ({
      ...g,
      question_count: g.questions?.[0]?.count ?? 0,
    })),
    subjects: subjects ?? [],
  };
}

export const createExamAction = enhanceAction(
  async (data: CreateExamInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'create');

    const client = getSupabaseServerClient();

    const { data: quotaOk, error: quotaError } = await client.rpc(
      'check_exam_quota',
      { p_organization_id: ctx.organization.id },
    );

    if (quotaError) {
      throw quotaError;
    }

    if (!quotaOk) {
      throw new LmsError(
        LMS_ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        'Exam limit reached for current plan',
      );
    }

    const { data: exam, error } = await client
      .from('exams')
      .insert({
        organization_id: ctx.organization.id,
        title: data.title,
        description: data.description ?? null,
        duration_minutes: data.durationMinutes,
        pass_score: data.passScore,
        total_score: data.totalScore,
        max_attempts: data.maxAttempts ?? null,
        subject_id: data.subjectId ?? null,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    const { error: sectionError } = await client.from('exam_sections').insert({
      organization_id: ctx.organization.id,
      exam_id: exam.id,
      title: 'Part 1',
      sort_order: 0,
      created_by: user.id,
    });

    if (sectionError) {
      await softDeleteOrgRow(
        client,
        'exams',
        exam.id,
        ctx.organization.id,
      );
      throw sectionError;
    }

    revalidatePath('/home/exams');

    return { success: true, id: exam.id };
  },
  { schema: CreateExamSchema },
);

export const updateExamAction = enhanceAction(
  async (data: UpdateExamInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('exams')
      .update({
        title: data.title,
        description: data.description ?? null,
        duration_minutes: data.durationMinutes,
        pass_score: data.passScore,
        total_score: data.totalScore,
        max_attempts: data.maxAttempts ?? null,
        subject_id: data.subjectId ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.id));

    return { success: true };
  },
  { schema: UpdateExamSchema },
);

export const deleteExamAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRowsByColumn(
      client,
      { table: 'exam_sections', column: 'exam_id' },
      data.id,
      ctx.organization.id,
    );

    await softDeleteOrgRow(client, 'exams', data.id, ctx.organization.id);

    revalidatePath('/home/exams');

    return { success: true };
  },
  { schema: DeleteExamSchema },
);

export const publishExamAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { data: sectionRows } = await client
      .from('exam_sections')
      .select('id')
      .eq('exam_id', data.id)
      .is('deleted_at', null);

    const sectionIds = sectionRows?.map((s) => s.id) ?? [];

    if (sectionIds.length === 0) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Exam must have at least one section with questions before publishing',
      );
    }

    const { count } = await client
      .from('exam_section_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .in('section_id', sectionIds);

    if (!count || count === 0) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Exam must have at least one question before publishing',
      );
    }

    const { error } = await client
      .from('exams')
      .update({ status: 'published' })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.id));

    return { success: true };
  },
  { schema: PublishExamSchema },
);

const EXAM_STATUS_TRANSITIONS: Record<string, string[]> = {
  published: ['archived', 'closed'],
  archived: ['published', 'draft'],
  closed: ['published'],
};

export const updateExamStatusAction = enhanceAction(
  async (data: { id: string; status: 'draft' | 'published' | 'archived' | 'closed' }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { data: exam, error: fetchError } = await client
      .from('exams')
      .select('status')
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !exam) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Exam not found');
    }

    const allowed = EXAM_STATUS_TRANSITIONS[exam.status] ?? [];

    if (!allowed.includes(data.status)) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        `Cannot change exam status from ${exam.status} to ${data.status}`,
      );
    }

    const { error } = await client
      .from('exams')
      .update({ status: data.status })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.id));
    revalidatePath('/home/exams');

    return { success: true };
  },
  { schema: UpdateExamStatusSchema },
);

export const createSectionAction = enhanceAction(
  async (data: CreateSectionInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { count } = await client
      .from('exam_sections')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', data.examId)
      .is('deleted_at', null);

    const { error } = await client.from('exam_sections').insert({
      organization_id: ctx.organization.id,
      exam_id: data.examId,
      title: data.title,
      description: data.description ?? null,
      duration_minutes: data.durationMinutes ?? null,
      sort_order: count ?? 0,
      created_by: user.id,
    });

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: CreateSectionSchema },
);

export const updateSectionAction = enhanceAction(
  async (data: UpdateSectionInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('exam_sections')
      .update({
        title: data.title,
        description: data.description ?? null,
        duration_minutes: data.durationMinutes ?? null,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id);

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: UpdateSectionSchema },
);

export const deleteSectionAction = enhanceAction(
  async (data: { id: string; examId: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    await softDeleteOrgRowsByColumn(
      client,
      { table: 'exam_section_items', column: 'section_id' },
      data.id,
      ctx.organization.id,
    );

    await softDeleteOrgRow(
      client,
      'exam_sections',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: DeleteSectionSchema },
);

export const addSectionItemAction = enhanceAction(
  async (data: AddSectionItemInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    const { count } = await client
      .from('exam_section_items')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', data.sectionId)
      .is('deleted_at', null);

    const { error } = await client.from('exam_section_items').insert({
      organization_id: ctx.organization.id,
      section_id: data.sectionId,
      question_id: data.questionId ?? null,
      question_group_id: data.questionGroupId ?? null,
      score: data.score,
      sort_order: count ?? 0,
      created_by: user.id,
    });

    if (error) {
      throw error;
    }

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: AddSectionItemSchema },
);

export const removeSectionItemAction = enhanceAction(
  async (data: { id: string; examId: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    await softDeleteOrgRow(
      client,
      'exam_section_items',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: RemoveSectionItemSchema },
);

export const reorderSectionsAction = enhanceAction(
  async (data: { examId: string; sectionIds: string[] }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    await Promise.all(
      data.sectionIds.map((sectionId, index) =>
        client
          .from('exam_sections')
          .update({ sort_order: index })
          .eq('id', sectionId)
          .eq('exam_id', data.examId)
          .eq('organization_id', ctx.organization.id),
      ),
    );

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: ReorderSectionsSchema },
);

export const reorderSectionItemsAction = enhanceAction(
  async (
    data: { examId: string; sectionId: string; itemIds: string[] },
    user,
  ) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'update');

    const client = getSupabaseServerClient();

    await Promise.all(
      data.itemIds.map((itemId, index) =>
        client
          .from('exam_section_items')
          .update({ sort_order: index })
          .eq('id', itemId)
          .eq('section_id', data.sectionId)
          .eq('organization_id', ctx.organization.id),
      ),
    );

    revalidatePath(examPath(data.examId));

    return { success: true };
  },
  { schema: ReorderSectionItemsSchema },
);

export const createQuestionGroupAction = enhanceAction(
  async (data: CreateQuestionGroupInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'questions', 'create');

    const client = getSupabaseServerClient();

    const { data: group, error } = await client
      .from('question_groups')
      .insert({
        organization_id: ctx.organization.id,
        bank_id: data.bankId,
        title: data.title,
        group_type: data.groupType,
        shared_content: data.sharedContent ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return { success: true, id: group.id };
  },
  { schema: CreateQuestionGroupSchema },
);

export const startPreviewAttemptAction = enhanceAction(
  async (data: { examId: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'exams', 'read');

    const client = getSupabaseServerClient();

    const { data: exam, error: examError } = await client
      .from('exams')
      .select('id, status, title')
      .eq('id', data.examId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (examError || !exam) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Exam not found');
    }

    const studentId = await ensureStudentProfile(client, {
      organizationId: ctx.organization.id,
      userId: user.id,
      email: user.email ?? `${user.id}@preview.local`,
      fullName: user.email?.split('@')[0] ?? 'Preview User',
      createdBy: user.id,
    });

    const { data: attempt, error } = await client
      .from('exam_attempts')
      .insert({
        organization_id: ctx.organization.id,
        exam_id: exam.id,
        student_id: studentId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        metadata: { is_preview: true } as Json,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    redirect(`/exam/take/${attempt.id}`);
  },
  { schema: z.object({ examId: z.string().uuid() }) },
);
