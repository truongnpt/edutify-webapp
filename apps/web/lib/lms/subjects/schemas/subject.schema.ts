import { z } from 'zod';

export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
});

export const UpdateSubjectSchema = CreateSubjectSchema.extend({
  id: z.string().uuid(),
});

export const DeleteSubjectSchema = z.object({
  id: z.string().uuid(),
});

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type DeleteSubjectInput = z.infer<typeof DeleteSubjectSchema>;
