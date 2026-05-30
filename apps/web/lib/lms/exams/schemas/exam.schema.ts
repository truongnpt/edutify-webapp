import { z } from 'zod';

export const CreateExamSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  durationMinutes: z.number().int().min(1).max(480),
  passScore: z.number().min(0).max(100),
  totalScore: z.number().min(1).max(10000),
  maxAttempts: z.number().int().min(1).max(100).nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
});

export const UpdateExamSchema = CreateExamSchema.extend({
  id: z.string().uuid(),
});

export const UpdateExamStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived', 'closed']),
});

export const ReorderSectionsSchema = z.object({
  examId: z.string().uuid(),
  sectionIds: z.array(z.string().uuid()).min(1),
});

export const ReorderSectionItemsSchema = z.object({
  examId: z.string().uuid(),
  sectionId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()),
});

export const DeleteExamSchema = z.object({
  id: z.string().uuid(),
});

export const PublishExamSchema = z.object({
  id: z.string().uuid(),
});

export const CreateSectionSchema = z.object({
  examId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(1).optional(),
});

export const UpdateSectionSchema = CreateSectionSchema.extend({
  id: z.string().uuid(),
});

export const DeleteSectionSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
});

export const AddSectionItemSchema = z
  .object({
    sectionId: z.string().uuid(),
    examId: z.string().uuid(),
    questionId: z.string().uuid().optional(),
    questionGroupId: z.string().uuid().optional(),
    score: z.number().min(0).max(1000),
  })
  .refine((d) => Boolean(d.questionId) !== Boolean(d.questionGroupId), {
    message: 'Provide either questionId or questionGroupId',
  });

export const RemoveSectionItemSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
});

export const CreateQuestionGroupSchema = z.object({
  bankId: z.string().uuid(),
  title: z.string().min(1).max(500),
  groupType: z.enum([
    'passage',
    'audio',
    'image',
    'video',
    'case_study',
    'document',
    'none',
  ]),
  sharedContent: z.string().max(50000).optional(),
});

export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;
export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export type UpdateExamInput = z.infer<typeof UpdateExamSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type AddSectionItemInput = z.infer<typeof AddSectionItemSchema>;
export type CreateQuestionGroupInput = z.infer<typeof CreateQuestionGroupSchema>;
