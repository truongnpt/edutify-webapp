import { z } from 'zod';

export const OrganizationRoleEnum = z.enum([
  'admin',
  'teacher',
  'student',
]);

export const UpdateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: OrganizationRoleEnum,
});

export const RemoveMemberSchema = z.object({
  memberId: z.string().uuid(),
});

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;
