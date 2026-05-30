export {
  resolveStudentProfile,
} from './resolve-student-profile';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/lib/database.types';

import { resolveStudentProfile } from './resolve-student-profile';

type Client = SupabaseClient<Database>;

export async function ensureStudentProfile(
  client: Client,
  params: {
    organizationId: string;
    userId: string;
    email: string;
    fullName: string;
    createdBy: string;
  },
) {
  const id = await resolveStudentProfile(client, params, { allowCreate: true });

  if (!id) {
    throw new Error('Failed to resolve student profile');
  }

  return id;
}
