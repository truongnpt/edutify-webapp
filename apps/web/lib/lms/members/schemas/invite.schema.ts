import { z } from 'zod';

import type { OrganizationRole } from '~/lib/lms/types';

const InvitableRoleEnum = z.enum(['admin', 'teacher', 'student']);

export const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: InvitableRoleEnum,
});

export const CancelInviteSchema = z.object({
  id: z.string().uuid(),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(16).max(64),
});

export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type InvitableRole = z.infer<typeof InvitableRoleEnum>;

export const INVITABLE_ROLES: OrganizationRole[] = [
  'admin',
  'teacher',
  'student',
];
