import { z } from 'zod';

export const QuestionGroupTypeEnum = z.enum([
  'passage',
  'audio',
  'image',
  'video',
  'case_study',
  'document',
  'none',
]);

export const CreateQuestionGroupSchema = z.object({
  bankId: z.string().uuid(),
  title: z.string().min(1).max(500),
  groupType: QuestionGroupTypeEnum,
  sharedContent: z.string().max(50000).optional(),
  resourceUrl: z.string().max(2000).optional(),
});

export const UpdateQuestionGroupSchema = CreateQuestionGroupSchema.extend({
  id: z.string().uuid(),
});

export const DeleteQuestionGroupSchema = z.object({
  id: z.string().uuid(),
  bankId: z.string().uuid(),
});

export const AssignQuestionGroupSchema = z.object({
  questionId: z.string().uuid(),
  bankId: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
});

export type CreateQuestionGroupInput = z.infer<typeof CreateQuestionGroupSchema>;
export type UpdateQuestionGroupInput = z.infer<typeof UpdateQuestionGroupSchema>;
