'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';

export interface QuotaItem {
  key: 'students' | 'exams' | 'questions';
  used: number;
  max: number;
  percent: number;
  nearLimit: boolean;
  atLimit: boolean;
}

const FREE_PLAN_DEFAULTS = {
  max_students: 50,
  max_exams: 10,
  max_questions: 100,
};

export async function loadQuotaStatus(userId: string): Promise<{
  items: QuotaItem[];
  isOwner: boolean;
}> {
  const ctx = await getOrganizationContext(userId);
  const client = getSupabaseServerClient();
  const orgId = ctx.organization.id;

  let limits = {
    max_students: ctx.plan?.max_students ?? FREE_PLAN_DEFAULTS.max_students,
    max_exams: ctx.plan?.max_exams ?? FREE_PLAN_DEFAULTS.max_exams,
    max_questions: ctx.plan?.max_questions ?? FREE_PLAN_DEFAULTS.max_questions,
  };

  if (!ctx.plan) {
    const { data: freePlan } = await client
      .from('plans')
      .select('max_students, max_exams, max_questions')
      .eq('slug', 'free')
      .maybeSingle();

    if (freePlan) {
      limits = {
        max_students: freePlan.max_students,
        max_exams: freePlan.max_exams,
        max_questions: freePlan.max_questions,
      };
    }
  }

  const [
    { data: questionCount },
    { data: examCount },
    { data: studentCount },
  ] = await Promise.all([
    client.rpc('get_org_question_count', { p_organization_id: orgId }),
    client.rpc('get_org_exam_count', { p_organization_id: orgId }),
    client.rpc('get_org_student_count', { p_organization_id: orgId }),
  ]);

  const rows: Array<{ key: QuotaItem['key']; used: number; max: number }> = [
    { key: 'students', used: studentCount ?? 0, max: limits.max_students },
    { key: 'exams', used: examCount ?? 0, max: limits.max_exams },
    { key: 'questions', used: questionCount ?? 0, max: limits.max_questions },
  ];

  return {
    items: rows
      .map(({ key, used, max }) => {
        const percent = max > 0 ? Math.round((used / max) * 100) : 0;

        return {
          key,
          used,
          max,
          percent,
          nearLimit: percent >= 80 && percent < 100,
          atLimit: used >= max,
        };
      })
      .filter((item) => item.nearLimit || item.atLimit),
    isOwner: ctx.membership.role === 'owner',
  };
}
