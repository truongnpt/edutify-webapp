import type { LmsModule, OrganizationRole } from '~/lib/lms/types';

import { PERMISSION_MATRIX } from './matrix';

export const MODULE_LABELS: Record<LmsModule, string> = {
  organization: 'Organization',
  members: 'Members',
  questionBank: 'Question Banks',
  questions: 'Questions',
  exams: 'Exams',
  assignments: 'Assignments',
  students: 'Students',
  attempts: 'Attempts',
  reports: 'Reports',
  subscription: 'Subscription',
  billing: 'Billing',
};

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
};

export function getPermissionMatrixRows() {
  const modules = Object.keys(PERMISSION_MATRIX) as LmsModule[];

  return modules.map((module) => ({
    module,
    label: MODULE_LABELS[module],
    roles: (['owner', 'admin', 'teacher', 'student'] as OrganizationRole[]).map(
      (role) => ({
        role,
        actions: PERMISSION_MATRIX[module]?.[role] ?? [],
      }),
    ),
  }));
}
