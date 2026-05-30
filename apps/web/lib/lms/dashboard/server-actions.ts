'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

export async function loadDashboardStats(userId: string) {
  const ctx = await getOrganizationContext(userId);
  const client = getSupabaseServerClient();
  const orgId = ctx.organization.id;
  const isStudent = ctx.membership.role === 'student';

  if (isStudent) {
    assertPermission(ctx.membership.role, 'assignments', 'read');

    const { data: studentRow } = await client
      .from('students')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!studentRow) {
      return {
        context: ctx,
        role: 'student' as const,
        stats: {
          activeAssignments: 0,
          completedAttempts: 0,
          averageScorePercent: null,
        },
      };
    }

    const now = new Date().toISOString();

    const [
      { count: activeAssignments },
      { data: attempts },
    ] = await Promise.all([
      client
        .from('exam_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('student_id', studentRow.id)
        .is('deleted_at', null)
        .lte('start_time', now)
        .gte('end_time', now),
      client
        .from('exam_attempts')
        .select('score, max_score, status')
        .eq('organization_id', orgId)
        .eq('student_id', studentRow.id)
        .in('status', ['graded', 'submitted'])
        .is('deleted_at', null),
    ]);

    const graded = (attempts ?? []).filter(
      (a) => a.status === 'graded' && a.max_score && a.max_score > 0,
    );

    const averageScorePercent =
      graded.length > 0 ?
        Math.round(
          graded.reduce(
            (sum, a) => sum + (Number(a.score) / Number(a.max_score)) * 100,
            0,
          ) / graded.length,
        )
      : null;

    return {
      context: ctx,
      role: 'student' as const,
      stats: {
        activeAssignments: activeAssignments ?? 0,
        completedAttempts: attempts?.length ?? 0,
        averageScorePercent,
      },
    };
  }

  const [
    { count: studentCount },
    { count: examCount },
    { count: questionCount },
    { count: assignmentCount },
    { data: recentAttempts },
  ] = await Promise.all([
    client
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .is('deleted_at', null),
    client
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    client
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    client
      .from('exam_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    client
      .from('exam_attempts')
      .select(
        `
        id,
        score,
        max_score,
        status,
        submitted_at,
        exam:exams (title, pass_score)
      `,
      )
      .eq('organization_id', orgId)
      .in('status', ['graded', 'submitted'])
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5),
  ]);

  const gradedAttempts = (recentAttempts ?? []).filter(
    (a) =>
      a.status === 'graded' &&
      a.max_score &&
      Number(a.max_score) > 0 &&
      a.exam &&
      typeof a.exam === 'object',
  );

  const passRate =
    gradedAttempts.length > 0 ?
      Math.round(
        (gradedAttempts.filter((a) => {
          const exam = a.exam as { pass_score: number };
          const pct = (Number(a.score) / Number(a.max_score)) * 100;

          return pct >= Number(exam.pass_score);
        }).length /
          gradedAttempts.length) *
          100,
      )
    : null;

  return {
    context: ctx,
    role: 'teacher' as const,
    stats: {
      studentCount: studentCount ?? 0,
      examCount: examCount ?? 0,
      questionCount: questionCount ?? 0,
      assignmentCount: assignmentCount ?? 0,
      passRate,
      recentAttempts: (recentAttempts ?? []).map((a) => ({
        id: a.id,
        score: a.score,
        max_score: a.max_score,
        status: a.status,
        submitted_at: a.submitted_at,
        examTitle:
          a.exam && typeof a.exam === 'object' ?
            (a.exam as { title: string }).title
          : '—',
      })),
    },
  };
}
