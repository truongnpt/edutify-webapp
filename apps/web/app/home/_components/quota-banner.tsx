import Link from 'next/link';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import type { QuotaItem } from '~/lib/lms/quota/load-quota-status';

interface QuotaBannerProps {
  items: QuotaItem[];
  showBillingLink?: boolean;
}

export function QuotaBanner({ items, showBillingLink }: QuotaBannerProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Alert variant={'destructive'}>
      <AlertTriangle className={'size-4'} />
      <AlertTitle>
        <Trans i18nKey={'lms:quota.bannerTitle'} />
      </AlertTitle>
      <AlertDescription className={'flex flex-col gap-2'}>
        <ul className={'list-inside list-disc text-sm'}>
          {items.map((item) => (
            <li key={item.key}>
              <Trans
                i18nKey={
                  item.atLimit ?
                    `lms:quota.${item.key}AtLimit`
                  : `lms:quota.${item.key}NearLimit`
                }
                values={{ used: item.used, max: item.max, percent: item.percent }}
              />
            </li>
          ))}
        </ul>
        {showBillingLink && (
          <Link
            href={pathsConfig.app.billing}
            className={'text-sm font-medium underline underline-offset-4'}
          >
            <Trans i18nKey={'lms:quota.upgradeLink'} />
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
