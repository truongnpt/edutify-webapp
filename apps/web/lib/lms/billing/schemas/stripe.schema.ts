import { z } from 'zod';

export const CreateStripeCheckoutSchema = z.object({
  planSlug: z.enum(['pro', 'enterprise']),
});

export const CreateStripePortalSchema = z.object({});

export type CreateStripeCheckoutInput = z.infer<typeof CreateStripeCheckoutSchema>;
