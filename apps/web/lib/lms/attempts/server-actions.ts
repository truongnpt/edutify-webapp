'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Json } from '~/lib/database.types';
import {
  formatCorrectAnswerDisplay,
  formatStudentAnswerDisplay,
  sanitizeAnswerSchemaForTaking,
} from '~/lib/lms/assessment/format-answer-display';
import {
  gradeAndFinalizeAttempt,
  writeAttemptLog,
} from '~/lib/lms/attempts/services/grade-attempt.service';
import {
  LogAttemptEventSchema,
  SaveAnswerSchema,
  StartAttemptSchema,
  SubmitAttemptSchema,
  type LogAttemptEventInput,
  type SaveAnswerInput,
} from '~/lib/lms/attempts/schemas/attempt.schema';
import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission, hasPermission } from '~/lib/lms/permissions/matrix';
import { resolveStudentProfile } from '~/lib/lms/students/resolve-student-profile';
import type { OrganizationContext } from '~/lib/lms/types';

function isPreviewAttempt(metadata: unknown): boolean {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'is_preview' in metadata &&
    (metadata as { is_preview?: boolean }).is_preview === true
  );
}

function assertAttemptWriteAccess(
  ctx: OrganizationContext,
  attemptMetadata: unknown,
) {
  if (hasPermission(ctx.membership.role, 'attempts', 'create')) {
    return;
  }

  if (
    isPreviewAttempt(attemptMetadata) &&
    hasPermission(ctx.membership.role, 'exams', 'read')
  ) {
    return;
  }

  assertPermission(ctx.membership.role, 'attempts', 'create');
}

function computeExpiresAt(
  startedAt: string | null,
  durationMinutes: number,
  assignmentEndTime: string | null,
): string | null {
  if (!startedAt) return null;

  const examDeadline =
    new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  let deadline = examDeadline;

  if (assignmentEndTime) {
    deadline = Math.min(deadline, new Date(assignmentEndTime).getTime());
  }

  return new Date(deadline).toISOString();
}

function sanitizeQuestionForTaking(question: Record<string, unknown>) {
  return {
    ...question,
    answer_schema: sanitizeAnswerSchemaForTaking(
      question.answer_schema as Record<string, unknown> | undefined,
    ),
    explanation: undefined,
  };
}

export async function loadAttemptForTaking(userId: string, attemptId: string) {
  const ctx = await getOrganizationContext(userId);
  const client = getSupabaseServerClient();
  const isSubmitted = (status: string) =>
    status === 'graded' || status === 'submitted';

  const { data: attempt, error } = await client
    .from('exam_attempts')
    .select(
      `
      id,
      exam_id,
      student_id,
      assignment_id,
      status,
      score,
      max_score,
      started_at,
      submitted_at,
      metadata,
      exam:exams (
        id,
        title,
        description,
        duration_minutes,
        pass_score,
        total_score
      ),
      assignment:exam_assignments (
        end_time
      )
    `,
    )
    .eq('id', attemptId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .single();

  if (error || !attempt?.exam) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
  }

  const exam = attempt.exam as {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    pass_score: number;
    total_score: number;
  };

  const submitted = isSubmitted(attempt.status);

  const { data: sections } = await client
    .from('exam_sections')
    .select(
      `
      id,
      title,
      description,
      sort_order,
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
          answer_schema,
          metadata,
          explanation
        ),
        question_group:question_groups (
          id,
          title,
          group_type,
          shared_content,
          resource_url,
          metadata
        )
      )
    `,
    )
    .eq('exam_id', attempt.exam_id)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  const groupIds = (sections ?? [])
    .flatMap((s) => s.items ?? [])
    .map((i) => i.question_group_id)
    .filter(Boolean) as string[];

  let groupQuestionsMap: Record<string, Array<Record<string, unknown>>> = {};

  if (groupIds.length > 0) {
    const { data: gQuestions } = await client
      .from('questions')
      .select(
        'id, title, content, question_type, answer_schema, metadata, explanation, question_group_id',
      )
      .in('question_group_id', groupIds)
      .is('deleted_at', null)
      .order('created_at');

    groupQuestionsMap = (gQuestions ?? []).reduce<
      Record<string, Array<Record<string, unknown>>>
    >((acc, q) => {
      const gid = q.question_group_id as string;

      if (!acc[gid]) {
        acc[gid] = [];
      }

      acc[gid].push(q);

      return acc;
    }, {});
  }

  const { data: savedAnswers } = await client
    .from('attempt_answers')
    .select(
      'question_id, answer_data, score, is_correct, max_score, feedback',
    )
    .eq('attempt_id', attemptId)
    .is('deleted_at', null);

  const answersMap = Object.fromEntries(
    (savedAnswers ?? []).map((a) => [a.question_id, a.answer_data]),
  );

  const gradesMap = Object.fromEntries(
    (savedAnswers ?? []).map((a) => [a.question_id, a]),
  );

  const processedSections = (sections ?? []).map((section) => ({
    ...section,
    items: (section.items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => {
        const question =
          item.question && typeof item.question === 'object' ?
            submitted ?
              item.question
            : sanitizeQuestionForTaking(
                item.question as Record<string, unknown>,
              )
          : item.question;

        const groupQuestions =
          item.question_group_id ?
            (groupQuestionsMap[item.question_group_id] ?? []).map((q) =>
              submitted ? q : sanitizeQuestionForTaking(q),
            )
          : [];

        return {
          ...item,
          question,
          groupQuestions,
        };
      }),
  }));

  const questionResults: Array<{
    questionId: string;
    content: string;
    questionType: string;
    sectionTitle: string;
    studentAnswer: string;
    correctAnswer: string | null;
    isCorrect: boolean | null;
    score: number | null;
    maxScore: number | null;
    explanation: string | null;
  }> = [];

  if (submitted) {
    let index = 0;

    for (const section of processedSections) {
      for (const item of section.items) {
        const pushResult = (q: Record<string, unknown>) => {
          index += 1;
          const schema = (q.answer_schema ?? {}) as Record<string, unknown>;
          const options = schema.options as
            | Array<{ key: string; content: string }>
            | undefined;
          const grade = gradesMap[q.id as string];
          const answerData = (answersMap[q.id as string] ?? {}) as Record<
            string,
            unknown
          >;

          questionResults.push({
            questionId: q.id as string,
            content: String(q.content ?? ''),
            questionType: String(q.question_type ?? ''),
            sectionTitle: `${section.title} · Q${index}`,
            studentAnswer: formatStudentAnswerDisplay(
              String(q.question_type ?? ''),
              answerData,
              options,
              schema,
            ),
            correctAnswer: formatCorrectAnswerDisplay(
              String(q.question_type ?? ''),
              schema,
            ),
            isCorrect: grade?.is_correct ?? null,
            score: grade?.score != null ? Number(grade.score) : null,
            maxScore: grade?.max_score != null ? Number(grade.max_score) : null,
            explanation: (q.explanation as string | null) ?? null,
          });
        };

        if (item.question && typeof item.question === 'object') {
          pushResult(item.question as Record<string, unknown>);
        }

        for (const gq of item.groupQuestions ?? []) {
          pushResult(gq as Record<string, unknown>);
        }
      }
    }
  }

  const assignmentEnd =
    attempt.assignment && typeof attempt.assignment === 'object' ?
      ((attempt.assignment as { end_time: string | null }).end_time ?? null)
    : null;

  let autoSubmitted = false;

  if (submitted) {
    const { data: autoLog } = await client
      .from('attempt_logs')
      .select('id')
      .eq('attempt_id', attemptId)
      .eq('action', 'attempt.auto_submitted')
      .limit(1)
      .maybeSingle();

    autoSubmitted = Boolean(autoLog);
  }

  return {
    context: ctx,
    attempt,
    sections: processedSections,
    answersMap,
    expiresAt: submitted ?
      null
    : computeExpiresAt(attempt.started_at, exam.duration_minutes, assignmentEnd),
    questionResults,
    autoSubmitted,
  };
}

export const startAttemptAction = enhanceAction(
  async (data: { examId: string; assignmentId?: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'attempts', 'create');

    const client = getSupabaseServerClient();

    const { data: exam, error: examError } = await client
      .from('exams')
      .select('id, status, max_attempts')
      .eq('id', data.examId)
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (examError || !exam) {
      throw new LmsError(
        LMS_ERROR_CODES.NOT_FOUND,
        'Published exam not found',
      );
    }

    const studentId = await resolveStudentProfile(
      client,
      {
        organizationId: ctx.organization.id,
        userId: user.id,
        email: user.email ?? `${user.id}@student.local`,
        fullName: user.email?.split('@')[0] ?? 'Student',
        createdBy: user.id,
      },
      { allowCreate: data.assignmentId ? false : true },
    );

    if (!studentId) {
      throw new LmsError(
        LMS_ERROR_CODES.NOT_FOUND,
        'Student profile not found. Ask your teacher to add you with your account email.',
      );
    }

    if (data.assignmentId) {
      const { data: assignment, error: assignmentError } = await client
        .from('exam_assignments')
        .select('id, student_id, start_time, end_time')
        .eq('id', data.assignmentId)
        .eq('organization_id', ctx.organization.id)
        .eq('exam_id', data.examId)
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .single();

      if (assignmentError || !assignment) {
        throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Assignment not found');
      }

      const now = new Date();

      if (now < new Date(assignment.start_time)) {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'This exam is not available yet',
        );
      }

      if (now > new Date(assignment.end_time)) {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'This assignment has expired',
        );
      }

      const { data: existingAttempt } = await client
        .from('exam_attempts')
        .select('id, status')
        .eq('assignment_id', data.assignmentId)
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .in('status', ['in_progress', 'submitted', 'graded'])
        .maybeSingle();

      if (existingAttempt) {
        if (existingAttempt.status === 'in_progress') {
          return { success: true, attemptId: existingAttempt.id };
        }

        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'You have already completed this assignment',
        );
      }
    }

    if (exam.max_attempts != null && exam.max_attempts > 0) {
      const { count: completedCount } = await client
        .from('exam_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.organization.id)
        .eq('exam_id', exam.id)
        .eq('student_id', studentId)
        .in('status', ['submitted', 'graded'])
        .is('deleted_at', null);

      if ((completedCount ?? 0) >= exam.max_attempts) {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          `Maximum ${exam.max_attempts} attempt(s) reached for this exam`,
        );
      }
    }

    const { data: attempt, error } = await client
      .from('exam_attempts')
      .insert({
        organization_id: ctx.organization.id,
        exam_id: exam.id,
        student_id: studentId,
        assignment_id: data.assignmentId ?? null,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    await writeAttemptLog(client, {
      organizationId: ctx.organization.id,
      attemptId: attempt.id,
      action: 'attempt.started',
    });

    return { success: true, attemptId: attempt.id };
  },
  { schema: StartAttemptSchema },
);

export const saveAnswerAction = enhanceAction(
  async (data: SaveAnswerInput, user) => {
    const ctx = await getOrganizationContext(user.id);

    const client = getSupabaseServerClient();

    const { data: attempt, error: attemptError } = await client
      .from('exam_attempts')
      .select('id, status, organization_id, metadata')
      .eq('id', data.attemptId)
      .eq('organization_id', ctx.organization.id)
      .single();

    if (attemptError || !attempt) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
    }

    assertAttemptWriteAccess(ctx, attempt.metadata);

    if (attempt.status !== 'in_progress') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Attempt is not in progress',
      );
    }

    const { data: existing } = await client
      .from('attempt_answers')
      .select('id')
      .eq('attempt_id', data.attemptId)
      .eq('question_id', data.questionId)
      .maybeSingle();

    if (existing) {
      const { error } = await client
        .from('attempt_answers')
        .update({
          answer_data: data.answerData as Json,
        })
        .eq('id', existing.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client.from('attempt_answers').insert({
        organization_id: ctx.organization.id,
        attempt_id: data.attemptId,
        question_id: data.questionId,
        answer_data: data.answerData as Json,
      });

      if (error) {
        throw error;
      }
    }

    await writeAttemptLog(client, {
      organizationId: ctx.organization.id,
      attemptId: data.attemptId,
      questionId: data.questionId,
      action: 'answer.saved',
      payload: { auto_save: true },
    });

    return { success: true };
  },
  { schema: SaveAnswerSchema },
);

export const submitAttemptAction = enhanceAction(
  async (data: { attemptId: string; autoSubmit?: boolean }, user) => {
    const ctx = await getOrganizationContext(user.id);

    const client = getSupabaseServerClient();

    const { data: attempt, error: attemptError } = await client
      .from('exam_attempts')
      .select('id, status, metadata')
      .eq('id', data.attemptId)
      .eq('organization_id', ctx.organization.id)
      .single();

    if (attemptError || !attempt) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
    }

    assertAttemptWriteAccess(ctx, attempt.metadata);

    if (attempt.status !== 'in_progress') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Attempt already submitted',
      );
    }

    const result = await gradeAndFinalizeAttempt({
      client,
      attemptId: data.attemptId,
      organizationId: ctx.organization.id,
    });

    await writeAttemptLog(client, {
      organizationId: ctx.organization.id,
      attemptId: data.attemptId,
      action: data.autoSubmit ? 'attempt.auto_submitted' : 'attempt.submitted',
      payload: {
        score: result.totalScore,
        max_score: result.maxScore,
      },
    });

    revalidatePath(`/exam/take/${data.attemptId}`);

    return {
      success: true,
      ...result,
    };
  },
  { schema: SubmitAttemptSchema },
);

export const logAttemptEventAction = enhanceAction(
  async (data: LogAttemptEventInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    const client = getSupabaseServerClient();

    const { data: attempt, error: attemptError } = await client
      .from('exam_attempts')
      .select('id, status, metadata')
      .eq('id', data.attemptId)
      .eq('organization_id', ctx.organization.id)
      .single();

    if (attemptError || !attempt) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
    }

    assertAttemptWriteAccess(ctx, attempt.metadata);

    if (attempt.status !== 'in_progress') {
      return { tabSwitchCount: 0 };
    }

    const metadata = (attempt.metadata ?? {}) as Record<string, unknown>;
    let tabSwitchCount = Number(metadata.tabSwitchCount ?? 0);

    if (data.event === 'tab_switch') {
      tabSwitchCount += 1;

      await client
        .from('exam_attempts')
        .update({
          metadata: {
            ...metadata,
            tabSwitchCount,
          } as Json,
        })
        .eq('id', data.attemptId);
    }

    await writeAttemptLog(client, {
      organizationId: ctx.organization.id,
      attemptId: data.attemptId,
      action: `anti_cheat.${data.event}`,
      payload: { tabSwitchCount },
    });

    return { tabSwitchCount };
  },
  { schema: LogAttemptEventSchema },
);

const MAX_ANSWER_FILE_SIZE = 10 * 1024 * 1024;

const FILE_CATEGORIES = {
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
} as const;

const FILE_CATEGORY_ERRORS: Record<keyof typeof FILE_CATEGORIES, string> = {
  document: 'File type not allowed (PDF, DOC, DOCX, JPG, PNG)',
  audio: 'File type not allowed (MP3, WAV, WEBM, OGG, M4A)',
  spreadsheet: 'File type not allowed (XLS, XLSX, CSV)',
};

export async function uploadAttemptAnswerFile(formData: FormData) {
  const client = getSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new LmsError(LMS_ERROR_CODES.PERMISSION_DENIED, 'Not authenticated');
  }

  const ctx = await getOrganizationContext(user.id);
  const attemptId = String(formData.get('attemptId') ?? '');
  const questionId = String(formData.get('questionId') ?? '');
  const fileCategory = String(formData.get('fileCategory') ?? 'document');
  const file = formData.get('file');

  const category =
    fileCategory in FILE_CATEGORIES
      ? (fileCategory as keyof typeof FILE_CATEGORIES)
      : 'document';
  const allowedTypes = FILE_CATEGORIES[category];

  if (!attemptId || !questionId || !(file instanceof File)) {
    throw new LmsError(LMS_ERROR_CODES.VALIDATION_ERROR, 'Invalid upload');
  }

  const { data: attempt, error: attemptError } = await client
    .from('exam_attempts')
    .select('id, status, metadata, organization_id')
    .eq('id', attemptId)
    .eq('organization_id', ctx.organization.id)
    .single();

  if (attemptError || !attempt) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
  }

  assertAttemptWriteAccess(ctx, attempt.metadata);

  if (attempt.status !== 'in_progress') {
    throw new LmsError(LMS_ERROR_CODES.VALIDATION_ERROR, 'Attempt is not in progress');
  }

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    throw new LmsError(
      LMS_ERROR_CODES.VALIDATION_ERROR,
      FILE_CATEGORY_ERRORS[category],
    );
  }

  if (file.size > MAX_ANSWER_FILE_SIZE) {
    throw new LmsError(LMS_ERROR_CODES.VALIDATION_ERROR, 'File must be under 10MB');
  }

  const extension = file.name.split('.').pop() ?? 'bin';
  const path = `${ctx.organization.id}/${attemptId}/${questionId}/${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await client.storage
    .from('attempt_uploads')
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new LmsError(
      LMS_ERROR_CODES.VALIDATION_ERROR,
      uploadError.message ?? 'Upload failed',
    );
  }

  return {
    filePath: path,
    fileName: file.name,
    mimeType: file.type,
  };
}

export async function getAttemptUploadSignedUrl(filePath: string) {
  const client = getSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new LmsError(LMS_ERROR_CODES.PERMISSION_DENIED, 'Not authenticated');
  }

  const ctx = await getOrganizationContext(user.id);
  assertPermission(ctx.membership.role, 'attempts', 'read');

  const { data, error } = await client.storage
    .from('attempt_uploads')
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    throw new LmsError(
      LMS_ERROR_CODES.VALIDATION_ERROR,
      error?.message ?? 'Could not load file',
    );
  }

  return { url: data.signedUrl };
}
