import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Json } from '~/lib/database.types';
import {
  gradeAnswer,
  type GradingInput,
} from '~/lib/lms/assessment/grading-engine';
import type { AssessmentQuestionType } from '~/lib/lms/assessment/question-types';
import type { ScoringSchema } from '~/lib/lms/assessment/answer-schema';
import type { Database } from '~/lib/database.types';

type Client = SupabaseClient<Database>;

interface GradeAttemptParams {
  client: Client;
  attemptId: string;
  organizationId: string;
}

export async function gradeAndFinalizeAttempt({
  client,
  attemptId,
  organizationId,
}: GradeAttemptParams) {
  const { data: attempt, error: attemptError } = await client
    .from('exam_attempts')
    .select('id, exam_id, status')
    .eq('id', attemptId)
    .eq('organization_id', organizationId)
    .single();

  if (attemptError || !attempt) {
    throw new Error('Attempt not found');
  }

  const { data: sectionItems } = await client
    .from('exam_section_items')
    .select(
      `
      question_id,
      score,
      section:exam_sections!inner (
        exam_id
      )
    `,
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  const examItems = (sectionItems ?? []).filter(
    (item) =>
      item.section &&
      typeof item.section === 'object' &&
      'exam_id' in item.section &&
      item.section.exam_id === attempt.exam_id &&
      item.question_id,
  );

  const scoreByQuestion = new Map<string, number>();

  for (const item of examItems) {
    if (item.question_id) {
      scoreByQuestion.set(item.question_id, Number(item.score));
    }
  }

  const { data: groupItems } = await client
    .from('exam_section_items')
    .select(
      `
      question_group_id,
      score,
      section:exam_sections!inner (exam_id)
    `,
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('question_group_id', 'is', null);

  const groupIds = (groupItems ?? [])
    .filter(
      (g) =>
        g.section &&
        typeof g.section === 'object' &&
        'exam_id' in g.section &&
        g.section.exam_id === attempt.exam_id &&
        g.question_group_id,
    )
    .map((g) => g.question_group_id as string);

  if (groupIds.length > 0) {
    const { data: groupQuestions } = await client
      .from('questions')
      .select('id, question_group_id')
      .in('question_group_id', groupIds)
      .is('deleted_at', null);

    for (const gItem of groupItems ?? []) {
      if (!gItem.question_group_id) continue;

      const related = (groupQuestions ?? []).filter(
        (q) => q.question_group_id === gItem.question_group_id,
      );

      for (const q of related) {
        scoreByQuestion.set(q.id, Number(gItem.score));
      }
    }
  }

  const { data: answers, error: answersError } = await client
    .from('attempt_answers')
    .select(
      `
      id,
      question_id,
      answer_data,
      question:questions (
        question_type,
        answer_schema,
        scoring_schema
      )
    `,
    )
    .eq('attempt_id', attemptId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (answersError) {
    throw answersError;
  }

  let totalScore = 0;
  let maxScore = 0;
  let requiresManual = false;

  for (const answer of answers ?? []) {
    const question = answer.question;

    if (!question || typeof question !== 'object') {
      continue;
    }

    const itemMax = scoreByQuestion.get(answer.question_id) ?? 1;
    const scoringSchema = {
      ...((question.scoring_schema as Record<string, unknown>) ?? {}),
      score: itemMax,
    } as ScoringSchema;

    const input: GradingInput = {
      questionType: question.question_type as AssessmentQuestionType,
      answerSchema: (question.answer_schema ?? {}) as Record<string, unknown>,
      scoringSchema,
      studentAnswer: (answer.answer_data ?? {}) as Record<string, unknown>,
    };

    const result = gradeAnswer(input);
    totalScore += result.score;
    maxScore += result.maxScore;

    if (result.requiresManualReview) {
      requiresManual = true;
    }

    await client
      .from('attempt_answers')
      .update({
        is_correct: result.isCorrect,
        score: result.score,
        max_score: result.maxScore,
        grading_mode: result.requiresManualReview ? 'manual' : 'auto',
        feedback: result.feedback ?? null,
        graded_at: result.requiresManualReview ? null : new Date().toISOString(),
      })
      .eq('id', answer.id);
  }

  const now = new Date().toISOString();

  await client
    .from('exam_attempts')
    .update({
      score: totalScore,
      max_score: maxScore,
      status: requiresManual ? 'submitted' : 'graded',
      submitted_at: now,
      graded_at: requiresManual ? null : now,
    })
    .eq('id', attemptId);

  return {
    totalScore,
    maxScore,
    requiresManual,
    status: requiresManual ? 'submitted' : 'graded',
  };
}

export async function writeAttemptLog(
  client: Client,
  params: {
    organizationId: string;
    attemptId: string;
    questionId?: string;
    action: string;
    payload?: Record<string, unknown>;
  },
) {
  await client.from('attempt_logs').insert({
    organization_id: params.organizationId,
    attempt_id: params.attemptId,
    question_id: params.questionId ?? null,
    action: params.action,
    payload: (params.payload ?? {}) as Json,
  });
}
