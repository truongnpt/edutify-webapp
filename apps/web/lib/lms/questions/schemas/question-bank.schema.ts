import { z } from 'zod';

export const CreateQuestionBankSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const UpdateQuestionBankSchema = CreateQuestionBankSchema.extend({
  id: z.string().uuid(),
});

export const DeleteQuestionBankSchema = z.object({
  id: z.string().uuid(),
});

export type CreateQuestionBankInput = z.infer<typeof CreateQuestionBankSchema>;
export type UpdateQuestionBankInput = z.infer<typeof UpdateQuestionBankSchema>;
export type DeleteQuestionBankInput = z.infer<typeof DeleteQuestionBankSchema>;
