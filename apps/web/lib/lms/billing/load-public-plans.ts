import 'server-only';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export interface PublicPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_students: number;
  max_exams: number;
  max_questions: number;
}

const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    price_monthly: 0,
    max_students: 20,
    max_exams: 5,
    max_questions: 100,
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    price_monthly: 799_000,
    max_students: 1000,
    max_exams: 500,
    max_questions: 10000,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    price_monthly: 2_490_000,
    max_students: 999999,
    max_exams: 999999,
    max_questions: 999999,
  },
];

export async function loadPublicPlans(): Promise<PublicPlan[]> {
  try {
    const admin = getSupabaseServerAdminClient();
    const { data, error } = await admin
      .from('plans')
      .select(
        'id, name, slug, price_monthly, max_students, max_exams, max_questions',
      )
      .eq('is_active', true)
      .order('price_monthly');

    if (error || !data?.length) {
      return FALLBACK_PLANS;
    }

    return data;
  } catch {
    return FALLBACK_PLANS;
  }
}

export function isUnlimitedQuota(value: number) {
  return value >= 999999;
}
