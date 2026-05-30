import type { LmsModule, OrganizationRole, PermissionAction } from '../types';

type PermissionMatrix = Record<
  LmsModule,
  Partial<Record<OrganizationRole, PermissionAction[]>>
>;

const CRUD: PermissionAction[] = ['create', 'read', 'update', 'delete'];
const CRU: PermissionAction[] = ['create', 'read', 'update'];
const R: PermissionAction[] = ['read'];
const CR: PermissionAction[] = ['create', 'read'];

export const PERMISSION_MATRIX: PermissionMatrix = {
  organization: {
    owner: CRUD,
    admin: R,
  },
  members: {
    owner: CRUD,
    admin: CRU,
    teacher: R,
  },
  questionBank: {
    owner: CRUD,
    admin: CRUD,
    teacher: CRUD,
  },
  questions: {
    owner: CRUD,
    admin: CRUD,
    teacher: CRUD,
  },
  exams: {
    owner: CRUD,
    admin: CRUD,
    teacher: CRUD,
    student: R,
  },
  assignments: {
    owner: CRUD,
    admin: CRUD,
    teacher: CRUD,
    student: R,
  },
  students: {
    owner: CRUD,
    admin: CRUD,
    teacher: CRU,
    student: ['read', 'update'],
  },
  attempts: {
    owner: ['read', 'update'],
    admin: ['read', 'update'],
    teacher: ['read', 'update'],
    student: CR,
  },
  reports: {
    owner: R,
    admin: R,
    teacher: R,
    student: R,
  },
  subscription: {
    owner: CRUD,
    admin: R,
  },
  billing: {
    owner: CRUD,
    admin: R,
  },
};

export function hasPermission(
  role: OrganizationRole,
  module: LmsModule,
  action: PermissionAction,
): boolean {
  const permissions = PERMISSION_MATRIX[module]?.[role];

  if (!permissions) {
    return false;
  }

  return permissions.includes(action);
}

export function assertPermission(
  role: OrganizationRole,
  module: LmsModule,
  action: PermissionAction,
): void {
  if (!hasPermission(role, module, action)) {
    throw new Error('PERMISSION_DENIED');
  }
}
