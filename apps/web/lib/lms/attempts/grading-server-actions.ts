'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

import {
  FinalizeAttemptGradingSchema,
  GradeManualAnswerSchema,
  type FinalizeAttemptGradingInput,
  type GradeManualAnswerInput,
} from './schemas/grading.schema';
import {
  criterionMaxScore,
  getRubricCriteria,
  serializeGradingFeedback,
} from './grading-feedback';

export async function loadPendingGradingAttempts(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'attempts', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('exam_attempts')
    .select(
      `
      id,
      score,
      max_score,
      submitted_at,
      exam:exams (title),
      student:students (full_name, email)
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .eq('status', 'submitted')
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return {
    context: ctx,
    attempts: (data ?? []).map((attempt) => ({
      id: attempt.id,
      score: attempt.score,
      max_score: attempt.max_score,
      submitted_at: attempt.submitted_at,
      examTitle:
        attempt.exam && typeof attempt.exam === 'object' ?
          (attempt.exam as { title: string }).title
        : '—',
      studentName:
        attempt.student && typeof attempt.student === 'object' ?
          (attempt.student as { full_name: string }).full_name
        : '—',
      studentEmail:
        attempt.student && typeof attempt.student === 'object' ?
          (attempt.student as { email: string }).email
        : '—',
    })),
  };
}

export async function loadAttemptForGrading(userId: string, attemptId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'attempts', 'read');

  const client = getSupabaseServerClient();

  const { data: attempt, error: attemptError } = await client
    .from('exam_attempts')
    .select(
      `
      id,
      status,
      score,
      max_score,
      submitted_at,
      exam:exams (title, pass_score),
      student:students (full_name, email)
    `,
    )
    .eq('id', attemptId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .single();

  if (attemptError || !attempt) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
  }

  const { data: answers, error: answersError } = await client
    .from('attempt_answers')
    .select(
      `
      id,
      question_id,
      answer_data,
      score,
      max_score,
      is_correct,
      feedback,
      grading_mode,
      graded_at,
      question:questions (
        content,
        question_type,
        explanation,
        scoring_schema
      )
    `,
    )
    .eq('attempt_id', attemptId)
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null);

  if (answersError) {
    throw answersError;
  }

  const pendingAnswers = (answers ?? []).filter(
    (answer) =>
      answer.grading_mode === 'manual' && answer.graded_at == null,
  );

  return {
    context: ctx,
    attempt,
    pendingAnswers: pendingAnswers.map((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      answerData: answer.answer_data as Record<string, unknown>,
      score: answer.score != null ? Number(answer.score) : 0,
      maxScore: answer.max_score != null ? Number(answer.max_score) : 1,
      isCorrect: answer.is_correct,
      feedback: answer.feedback,
      question:
        answer.question && typeof answer.question === 'object' ?
          {
            content: (answer.question as { content: string }).content,
            questionType: (answer.question as { question_type: string })
              .question_type,
            explanation:
              (answer.question as { explanation: string | null }).explanation,
            scoringSchema:
              (answer.question as { scoring_schema: Record<string, unknown> | null })
                .scoring_schema ?? null,
          }
        : null,
    })),
    allAnswers: answers ?? [],
  };
}

export const gradeManualAnswerAction = enhanceAction(
  async (data: GradeManualAnswerInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'attempts', 'update');

    const client = getSupabaseServerClient();

    const { data: answer, error: answerError } = await client
      .from('attempt_answers')
      .select(
        `
        id,
        attempt_id,
        grading_mode,
        max_score,
        question:questions (scoring_schema)
      `,
      )
      .eq('id', data.answerId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (answerError || !answer) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Answer not found');
    }

    if (answer.grading_mode !== 'manual') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'This answer does not require manual grading',
      );
    }

    if (data.score > data.maxScore) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Score cannot exceed max score',
      );
    }

    const scoringSchema =
      answer.question && typeof answer.question === 'object' ?
        ((answer.question as { scoring_schema: Record<string, unknown> | null })
          .scoring_schema ?? null)
      : null;
    const rubricCriteria = getRubricCriteria(scoringSchema);
    let finalScore = data.score;

    if (data.rubricScores && data.rubricScores.length > 0) {
      if (rubricCriteria.length === 0) {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'This answer does not use a rubric',
        );
      }

      const perCriterionMax = criterionMaxScore(
        data.maxScore,
        rubricCriteria.length,
      );

      for (const entry of data.rubricScores) {
        if (entry.index < 0 || entry.index >= rubricCriteria.length) {
          throw new LmsError(
            LMS_ERROR_CODES.VALIDATION_ERROR,
            'Invalid rubric criterion index',
          );
        }

        if (entry.score > perCriterionMax) {
          throw new LmsError(
            LMS_ERROR_CODES.VALIDATION_ERROR,
            'Rubric criterion score exceeds maximum',
          );
        }
      }

      finalScore = data.rubricScores.reduce((sum, entry) => sum + entry.score, 0);

      if (finalScore > data.maxScore) {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'Total rubric score exceeds max score',
        );
      }
    }

    const feedbackPayload = serializeGradingFeedback(
      data.feedback,
      data.rubricScores,
    );

    const { error } = await client
      .from('attempt_answers')
      .update({
        score: finalScore,
        max_score: data.maxScore,
        is_correct: data.isCorrect,
        feedback: feedbackPayload,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', data.answerId);

    if (error) {
      throw error;
    }

    revalidatePath('/home/grading');
    revalidatePath(`/home/grading/${answer.attempt_id}`);

    return { success: true };
  },
  { schema: GradeManualAnswerSchema },
);

export const finalizeAttemptGradingAction = enhanceAction(
  async (data: FinalizeAttemptGradingInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'attempts', 'update');

    const client = getSupabaseServerClient();

    const { data: attempt, error: attemptError } = await client
      .from('exam_attempts')
      .select('id, status')
      .eq('id', data.attemptId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (attemptError || !attempt) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Attempt not found');
    }

    if (attempt.status !== 'submitted') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Attempt is not pending grading',
      );
    }

    const { data: answers, error: answersError } = await client
      .from('attempt_answers')
      .select('id, score, max_score, grading_mode, graded_at')
      .eq('attempt_id', data.attemptId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (answersError) {
      throw answersError;
    }

    const ungraded = (answers ?? []).filter(
      (answer) =>
        answer.grading_mode === 'manual' && answer.graded_at == null,
    );

    if (ungraded.length > 0) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Grade all manual answers before finalizing',
      );
    }

    const totalScore = (answers ?? []).reduce(
      (sum, answer) => sum + Number(answer.score ?? 0),
      0,
    );
    const maxScore = (answers ?? []).reduce(
      (sum, answer) => sum + Number(answer.max_score ?? 0),
      0,
    );
    const now = new Date().toISOString();

    const { error } = await client
      .from('exam_attempts')
      .update({
        score: totalScore,
        max_score: maxScore,
        status: 'graded',
        graded_at: now,
      })
      .eq('id', data.attemptId);

    if (error) {
      throw error;
    }

    revalidatePath('/home/grading');
    revalidatePath(`/home/grading/${data.attemptId}`);
    revalidatePath(`/exam/take/${data.attemptId}`);

    return { success: true, totalScore, maxScore };
  },
  { schema: FinalizeAttemptGradingSchema },
);
