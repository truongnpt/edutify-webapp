import { z } from 'zod';

export const StartAttemptSchema = z.object({
  examId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
});

export const SaveAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerData: z.record(z.unknown()),
});

export const SubmitAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  autoSubmit: z.boolean().optional(),
});

export const LogAttemptEventSchema = z.object({
  attemptId: z.string().uuid(),
  event: z.enum(['tab_switch', 'copy_blocked']),
});

export type SaveAnswerInput = z.infer<typeof SaveAnswerSchema>;
export type LogAttemptEventInput = z.infer<typeof LogAttemptEventSchema>;
