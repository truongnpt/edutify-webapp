import { z } from 'zod';

export const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
