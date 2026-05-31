'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';
import { resolveStudentProfile } from '~/lib/lms/students/resolve-student-profile';
import { softDeleteOrgRow } from '~/lib/lms/soft-delete';

import {
  CreateAssignmentSchema,
  DeleteAssignmentSchema,
  getAssignmentWindowStatus,
  toIsoDateTime,
  type CreateAssignmentInput,
} from './schemas/assignment.schema';

const ASSIGNMENTS_PATH = '/home/assignments';

function examPath(examId: string) {
  return `/home/exams/${examId}`;
}

export async function loadAssignments(userId: string, examId?: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'assignments', 'read');

  const client = getSupabaseServerClient();

  let query = client
    .from('exam_assignments')
    .select(
      `
      id,
      exam_id,
      student_id,
      start_time,
      end_time,
      created_at,
      exam:exams (
        id,
        title,
        status
      ),
      student:students (
        id,
        full_name,
        email,
        status
      )
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .is('deleted_at', null)
    .order('start_time', { ascending: false });

  if (examId) {
    query = query.eq('exam_id', examId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const assignments = (data ?? []).map((row) => ({
    id: row.id,
    exam_id: row.exam_id,
    student_id: row.student_id,
    start_time: row.start_time,
    end_time: row.end_time,
    created_at: row.created_at,
    window_status: getAssignmentWindowStatus(row.start_time, row.end_time),
    exam: row.exam,
    student: row.student,
  }));

  return {
    context: ctx,
    assignments,
  };
}

export async function loadAssignmentFormOptions(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'assignments', 'create');

  const client = getSupabaseServerClient();

  const [{ data: exams }, { data: students }] = await Promise.all([
    client
      .from('exams')
      .select('id, title, status')
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('title'),
    client
      .from('students')
      .select('id, full_name, email, status')
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('full_name'),
  ]);

  return {
    context: ctx,
    exams: exams ?? [],
    students: students ?? [],
  };
}

export const createAssignmentAction = enhanceAction(
  async (data: CreateAssignmentInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'assignments', 'create');

    const client = getSupabaseServerClient();
    const startTime = toIsoDateTime(data.startTime);
    const endTime = toIsoDateTime(data.endTime);

    const { data: exam, error: examError } = await client
      .from('exams')
      .select('id, status')
      .eq('id', data.examId)
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (examError || !exam) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Only published exams can be assigned',
      );
    }

    const { data: validStudents, error: studentsError } = await client
      .from('students')
      .select('id')
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .in('id', data.studentIds);

    if (studentsError) {
      throw studentsError;
    }

    const validIds = new Set((validStudents ?? []).map((s) => s.id));
    const studentIds = data.studentIds.filter((id) => validIds.has(id));

    if (studentIds.length === 0) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'No valid active students selected',
      );
    }

    const { data: existing } = await client
      .from('exam_assignments')
      .select('student_id')
      .eq('organization_id', ctx.organization.id)
      .eq('exam_id', data.examId)
      .is('deleted_at', null)
      .in('student_id', studentIds);

    const alreadyAssigned = new Set((existing ?? []).map((a) => a.student_id));
    const toCreate = studentIds.filter((id) => !alreadyAssigned.has(id));

    if (toCreate.length === 0) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'All selected students already have an assignment for this exam',
      );
    }

    const { error: insertError } = await client.from('exam_assignments').insert(
      toCreate.map((studentId) => ({
        organization_id: ctx.organization.id,
        exam_id: data.examId,
        student_id: studentId,
        start_time: startTime,
        end_time: endTime,
        assigned_by: user.id,
      })),
    );

    if (insertError) {
      throw insertError;
    }

    revalidatePath(ASSIGNMENTS_PATH);
    revalidatePath(examPath(data.examId));

    return {
      success: true,
      created: toCreate.length,
      skipped: studentIds.length - toCreate.length,
    };
  },
  { schema: CreateAssignmentSchema },
);

export const deleteAssignmentAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'assignments', 'delete');

    const client = getSupabaseServerClient();

    const { data: assignment } = await client
      .from('exam_assignments')
      .select('exam_id')
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    await softDeleteOrgRow(
      client,
      'exam_assignments',
      data.id,
      ctx.organization.id,
    );

    revalidatePath(ASSIGNMENTS_PATH);

    if (assignment?.exam_id) {
      revalidatePath(examPath(assignment.exam_id));
    }

    return { success: true };
  },
  { schema: DeleteAssignmentSchema },
);

export async function loadMyAssignments(
  userId: string,
  userEmail: string,
  userDisplayName: string,
) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'assignments', 'read');

  const client = getSupabaseServerClient();

  const studentId = await resolveStudentProfile(
    client,
    {
      organizationId: ctx.organization.id,
      userId,
      email: userEmail,
      fullName: userDisplayName,
      createdBy: userId,
    },
    { allowCreate: false },
  );

  if (!studentId) {
    return {
      context: ctx,
      assignments: [],
      studentLinked: false,
    };
  }

  const { data: assignments, error } = await client
    .from('exam_assignments')
    .select(
      `
      id,
      exam_id,
      start_time,
      end_time,
      created_at,
      exam:exams (
        id,
        title,
        description,
        duration_minutes,
        pass_score,
        status
      )
    `,
    )
    .eq('organization_id', ctx.organization.id)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('start_time', { ascending: false });

  if (error) {
    throw error;
  }

  const assignmentIds = (assignments ?? []).map((a) => a.id);

  const attemptByAssignment = new Map<
    string,
    {
      id: string;
      status: string;
      score: number | null;
      max_score: number | null;
      submitted_at: string | null;
    }
  >();

  if (assignmentIds.length > 0) {
    const { data: attempts } = await client
      .from('exam_attempts')
      .select('id, assignment_id, status, score, max_score, submitted_at')
      .eq('organization_id', ctx.organization.id)
      .eq('student_id', studentId)
      .in('assignment_id', assignmentIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    for (const attempt of attempts ?? []) {
      if (attempt.assignment_id && !attemptByAssignment.has(attempt.assignment_id)) {
        attemptByAssignment.set(attempt.assignment_id, {
          id: attempt.id,
          status: attempt.status,
          score: attempt.score,
          max_score: attempt.max_score,
          submitted_at: attempt.submitted_at,
        });
      }
    }
  }

  const items = (assignments ?? []).map((row) => ({
    id: row.id,
    exam_id: row.exam_id,
    start_time: row.start_time,
    end_time: row.end_time,
    created_at: row.created_at,
    window_status: getAssignmentWindowStatus(row.start_time, row.end_time),
    exam: row.exam,
    attempt: attemptByAssignment.get(row.id) ?? null,
  }));

  return {
    context: ctx,
    assignments: items,
    studentLinked: true,
  };
}
