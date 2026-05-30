import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  planSlug: z.enum(['pro', 'enterprise']),
  proofImagePath: z.string().min(1),
});

export const RejectPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const ApprovePaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
