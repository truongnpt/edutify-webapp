import { z } from 'zod';

const RubricCriterionScoreSchema = z.object({
  index: z.number().int().min(0),
  score: z.number().min(0),
});

export const GradeManualAnswerSchema = z.object({
  answerId: z.string().uuid(),
  score: z.number().min(0),
  maxScore: z.number().min(0),
  isCorrect: z.boolean(),
  feedback: z.string().max(5000).optional(),
  rubricScores: z.array(RubricCriterionScoreSchema).optional(),
});

export const FinalizeAttemptGradingSchema = z.object({
  attemptId: z.string().uuid(),
});

export type GradeManualAnswerInput = z.infer<typeof GradeManualAnswerSchema>;
export type FinalizeAttemptGradingInput = z.infer<
  typeof FinalizeAttemptGradingSchema
>;
