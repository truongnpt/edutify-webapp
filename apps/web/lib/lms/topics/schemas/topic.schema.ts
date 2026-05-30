import { z } from 'zod';

export const CreateTopicSchema = z.object({
  subjectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
});

export const UpdateTopicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export const DeleteTopicSchema = z.object({
  id: z.string().uuid(),
});

export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
