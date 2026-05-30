import { z } from 'zod';

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateTagSchema = CreateTagSchema.extend({
  id: z.string().uuid(),
});

export const DeleteTagSchema = z.object({
  id: z.string().uuid(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type DeleteTagInput = z.infer<typeof DeleteTagSchema>;
