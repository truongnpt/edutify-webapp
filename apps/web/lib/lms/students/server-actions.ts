'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateStudentSchema,
  DeleteStudentSchema,
  ImportStudentsSchema,
  UpdateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from './schemas/student.schema';

const STUDENTS_PATH = '/home/students';

export async function loadStudents(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'students', 'read');

  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('students')
    .select(
      'id, full_name, email, status, user_id, created_at, updated_at',
    )
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return {
    context: ctx,
    students: data ?? [],
  };
}

export const createStudentAction = enhanceAction(
  async (data: CreateStudentInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'students', 'create');

    const client = getSupabaseServerClient();

    const { data: quotaOk, error: quotaError } = await client.rpc(
      'check_student_quota',
      { p_organization_id: ctx.organization.id },
    );

    if (quotaError) {
      throw quotaError;
    }

    if (!quotaOk) {
      throw new LmsError(
        LMS_ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        'Student limit reached for current plan',
      );
    }

    const { error } = await client.from('students').insert({
      organization_id: ctx.organization.id,
      full_name: data.fullName,
      email: data.email.toLowerCase(),
      status: data.status,
      created_by: user.id,
    });

    if (error) {
      if (error.code === '23505') {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'A student with this email already exists',
        );
      }

      throw error;
    }

    revalidatePath(STUDENTS_PATH);

    return { success: true };
  },
  { schema: CreateStudentSchema },
);

export const updateStudentAction = enhanceAction(
  async (data: UpdateStudentInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'students', 'update');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('students')
      .update({
        full_name: data.fullName,
        email: data.email.toLowerCase(),
        status: data.status,
      })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null);

    if (error) {
      if (error.code === '23505') {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'A student with this email already exists',
        );
      }

      throw error;
    }

    revalidatePath(STUDENTS_PATH);

    return { success: true };
  },
  { schema: UpdateStudentSchema },
);

export const deleteStudentAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'students', 'delete');

    const client = getSupabaseServerClient();

    await softDeleteOrgRow(
      client,
      'students',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(STUDENTS_PATH);

    return { success: true };
  },
  { schema: DeleteStudentSchema },
);

export const importStudentsAction = enhanceAction(
  async (data: { students: Array<{ fullName: string; email: string }> }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'students', 'create');

    const client = getSupabaseServerClient();

    const { data: currentCount } = await client.rpc('get_org_student_count', {
      p_organization_id: ctx.organization.id,
    });

    const maxStudents =
      ctx.plan?.max_students ??
      (await client
        .from('plans')
        .select('max_students')
        .eq('slug', 'free')
        .maybeSingle()
        .then((r) => r.data?.max_students ?? 50)) ??
      50;

    const remaining = maxStudents - (currentCount ?? 0);

    if (remaining <= 0) {
      throw new LmsError(
        LMS_ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        'Student limit reached for current plan',
      );
    }

    const toImport = data.students.slice(0, remaining);
    let imported = 0;
    let skipped = 0;

    for (const student of toImport) {
      const { error } = await client.from('students').insert({
        organization_id: ctx.organization.id,
        full_name: student.fullName.trim(),
        email: student.email.trim().toLowerCase(),
        status: 'active',
        created_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          skipped++;
          continue;
        }

        throw error;
      }

      imported++;
    }

    skipped += data.students.length - toImport.length;

    revalidatePath(STUDENTS_PATH);

    return { success: true, imported, skipped };
  },
  { schema: ImportStudentsSchema },
);
