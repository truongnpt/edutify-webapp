import { z } from 'zod';

import {
  isAssessmentQuestionType,
  type AssessmentQuestionType,
} from '~/lib/lms/assessment/question-types';

const QuestionTypeEnum = z.custom<AssessmentQuestionType>(
  (val) => typeof val === 'string' && isAssessmentQuestionType(val),
  { message: 'Invalid question type' },
);

const QuestionOptionSchema = z.object({
  content: z.string().min(1).max(2000),
  isCorrect: z.boolean(),
  sortOrder: z.number().int().min(0),
});

const MatchingPairSchema = z.object({
  left: z.string().min(1).max(2000),
  right: z.string().min(1).max(2000),
});

const OrderingItemSchema = z.object({
  content: z.string().min(1).max(2000),
});

const RubricCriterionSchema = z.object({
  content: z.string().min(1).max(500),
});

const questionBaseSchema = z.object({
  bankId: z.string().uuid(),
  type: QuestionTypeEnum,
  title: z.string().max(500).optional(),
  content: z.string().min(1).max(10000),
  explanation: z.string().max(5000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  metadata: z.record(z.unknown()).optional(),
  scoringSchema: z.record(z.unknown()).optional(),
  options: z.array(QuestionOptionSchema).optional(),
  matchingPairs: z.array(MatchingPairSchema).optional(),
  orderingItems: z.array(OrderingItemSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  questionGroupId: z.string().uuid().nullable().optional(),
  allowCalculator: z.boolean().optional(),
  timeLimitSeconds: z.number().int().min(0).max(86400).optional(),
  mediaUrl: z.string().max(2000).optional(),
  codeLanguage: z.string().max(50).optional(),
  scoringMode: z.enum(['simple', 'negative', 'rubric']).optional(),
  questionScore: z.number().min(0).max(1000).optional(),
  wrongScore: z.number().max(0).optional(),
  rubricCriteria: z.array(RubricCriterionSchema).optional(),
});

function validateQuestionOptions(
  data: z.infer<typeof questionBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const needsOptions = [
    'single_choice',
    'multiple_choice',
    'true_false',
    'yes_no',
    'fill_blank',
  ].includes(data.type);

  if (needsOptions && (!data.options || data.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Options are required for this question type',
      path: ['options'],
    });
  }

  if (data.type === 'single_choice' && data.options) {
    const correctCount = data.options.filter((o) => o.isCorrect).length;

    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single choice must have exactly one correct answer',
        path: ['options'],
      });
    }
  }

  if (data.type === 'multiple_choice' && data.options) {
    const correctCount = data.options.filter((o) => o.isCorrect).length;

    if (correctCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Multiple choice must have at least one correct answer',
        path: ['options'],
      });
    }
  }

  if (
    (data.type === 'true_false' || data.type === 'yes_no') &&
    data.options
  ) {
    if (data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must have exactly 2 options',
        path: ['options'],
      });
    }
  }

  const matchingTypes = [
    'matching_pairs',
    'matching_headings',
    'matching_features',
    'matching_information',
    'image_labeling',
    'diagram_labeling',
    'map_labeling',
  ];

  if (matchingTypes.includes(data.type)) {
    if (!data.matchingPairs || data.matchingPairs.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least 2 matching pairs are required',
        path: ['matchingPairs'],
      });
    }
  }

  const labelingTypes = ['image_labeling', 'diagram_labeling', 'map_labeling'];

  if (labelingTypes.includes(data.type)) {
    if (!data.mediaUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Media URL is required for labeling questions',
        path: ['mediaUrl'],
      });
    }
  }

  const orderingTypes = ['sequence_order', 'drag_drop_order'];

  if (orderingTypes.includes(data.type)) {
    if (!data.orderingItems || data.orderingItems.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least 2 items are required for ordering',
        path: ['orderingItems'],
      });
    }
  }

  if (data.scoringMode === 'rubric') {
    if (!data.rubricCriteria || data.rubricCriteria.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one rubric criterion is required',
        path: ['rubricCriteria'],
      });
    }
  }
}

export const CreateQuestionSchema = questionBaseSchema.superRefine(
  validateQuestionOptions,
);

export const UpdateQuestionSchema = questionBaseSchema
  .extend({ id: z.string().uuid() })
  .superRefine(validateQuestionOptions);

export const DeleteQuestionSchema = z.object({
  id: z.string().uuid(),
});

export const UpdateQuestionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type DeleteQuestionInput = z.infer<typeof DeleteQuestionSchema>;
