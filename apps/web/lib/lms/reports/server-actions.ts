'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

export interface ExamReportRow {
  examId: string;
  examTitle: string;
  passScore: number;
  attemptCount: number;
  gradedCount: number;
  averagePercent: number | null;
  passRate: number | null;
}

export interface StudentReportRow {
  studentId: string;
  fullName: string;
  email: string;
  attemptCount: number;
  averagePercent: number | null;
  passRate: number | null;
}

function scorePercent(score: number | null, maxScore: number | null): number | null {
  if (score == null || maxScore == null || maxScore <= 0) {
    return null;
  }

  return Math.round((Number(score) / Number(maxScore)) * 100);
}

export async function loadReports(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'reports', 'read');

  const client = getSupabaseServerClient();
  const orgId = ctx.organization.id;
  const isStudent = ctx.membership.role === 'student';

  let studentFilterId: string | null = null;

  if (isStudent) {
    const { data: studentRow } = await client
      .from('students')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    studentFilterId = studentRow?.id ?? null;

    if (!studentFilterId) {
      return {
        role: 'student' as const,
        examReports: [] as ExamReportRow[],
        studentReports: [] as StudentReportRow[],
      };
    }
  }

  let attemptsQuery = client
    .from('exam_attempts')
    .select(
      `
      id,
      exam_id,
      student_id,
      score,
      max_score,
      status,
      exam:exams (id, title, pass_score),
      student:students (id, full_name, email)
    `,
    )
    .eq('organization_id', orgId)
    .in('status', ['graded', 'submitted'])
    .is('deleted_at', null);

  if (studentFilterId) {
    attemptsQuery = attemptsQuery.eq('student_id', studentFilterId);
  }

  const { data: attempts } = await attemptsQuery;

  const examMap = new Map<
    string,
    {
      title: string;
      passScore: number;
      attempts: typeof attempts;
    }
  >();

  const studentMap = new Map<
    string,
    {
      fullName: string;
      email: string;
      attempts: typeof attempts;
    }
  >();

  for (const attempt of attempts ?? []) {
    if (!attempt.exam || typeof attempt.exam !== 'object') {
      continue;
    }

    const exam = attempt.exam as { id: string; title: string; pass_score: number };
    const existingExam = examMap.get(exam.id);

    if (existingExam) {
      existingExam.attempts?.push(attempt);
    } else {
      examMap.set(exam.id, {
        title: exam.title,
        passScore: Number(exam.pass_score),
        attempts: [attempt],
      });
    }

    if (isStudent || !attempt.student || typeof attempt.student !== 'object') {
      continue;
    }

    const student = attempt.student as {
      id: string;
      full_name: string;
      email: string;
    };
    const existingStudent = studentMap.get(student.id);

    if (existingStudent) {
      existingStudent.attempts?.push(attempt);
    } else {
      studentMap.set(student.id, {
        fullName: student.full_name,
        email: student.email,
        attempts: [attempt],
      });
    }
  }

  const examReports: ExamReportRow[] = [...examMap.entries()]
    .map(([examId, row]) => {
      const graded = (row.attempts ?? []).filter(
        (a) => a.status === 'graded' && a.max_score && Number(a.max_score) > 0,
      );
      const percents = graded
        .map((a) => scorePercent(a.score, a.max_score))
        .filter((p): p is number => p != null);
      const passCount = graded.filter((a) => {
        const pct = scorePercent(a.score, a.max_score);

        return pct != null && pct >= row.passScore;
      }).length;

      return {
        examId,
        examTitle: row.title,
        passScore: row.passScore,
        attemptCount: row.attempts?.length ?? 0,
        gradedCount: graded.length,
        averagePercent:
          percents.length > 0 ?
            Math.round(
              percents.reduce((sum, p) => sum + p, 0) / percents.length,
            )
          : null,
        passRate:
          graded.length > 0 ?
            Math.round((passCount / graded.length) * 100)
          : null,
      };
    })
    .sort((a, b) => b.attemptCount - a.attemptCount);

  const studentReports: StudentReportRow[] =
    isStudent ?
      []
    : [...studentMap.entries()]
        .map(([studentId, row]) => {
          const graded = (row.attempts ?? []).filter(
            (a) =>
              a.status === 'graded' &&
              a.max_score &&
              Number(a.max_score) > 0 &&
              a.exam &&
              typeof a.exam === 'object',
          );
          const percents = graded
            .map((a) => scorePercent(a.score, a.max_score))
            .filter((p): p is number => p != null);
          const passCount = graded.filter((a) => {
            const exam = a.exam as { pass_score: number };
            const pct = scorePercent(a.score, a.max_score);

            return pct != null && pct >= Number(exam.pass_score);
          }).length;

          return {
            studentId,
            fullName: row.fullName,
            email: row.email,
            attemptCount: row.attempts?.length ?? 0,
            averagePercent:
              percents.length > 0 ?
                Math.round(
                  percents.reduce((sum, p) => sum + p, 0) / percents.length,
                )
              : null,
            passRate:
              graded.length > 0 ?
                Math.round((passCount / graded.length) * 100)
              : null,
          };
        })
        .sort((a, b) => b.attemptCount - a.attemptCount);

  return {
    role: isStudent ? ('student' as const) : ('teacher' as const),
    examReports,
    studentReports,
  };
}
