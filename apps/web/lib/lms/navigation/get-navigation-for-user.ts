import 'server-only';

import type { z } from 'zod';

import type { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import { getLmsNavigationConfig } from '~/config/lms-navigation.config';
import { isPlatformAdminClient } from '~/lib/lms/billing/server-actions';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';

export async function getNavigationForUser(userId: string) {
  const ctx = await getOrganizationContext(userId);
  const isPlatformAdmin = await isPlatformAdminClient();

  return getLmsNavigationConfig(ctx.membership.role, { isPlatformAdmin });
}

export type LmsNavigationConfig = z.infer<typeof NavigationConfigSchema>;
