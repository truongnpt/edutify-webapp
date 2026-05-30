import { Suspense } from 'react';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadBilling } from '~/lib/lms/billing/server-actions';
import { isStripeBillingEnabled } from '~/lib/lms/billing/stripe-server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { BillingPanel } from './_components/billing-panel';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:billing.pageTitle') };
};

async function BillingPage() {
  const user = await requireUserInServerComponent();
  const [{ context, upgradePlans, payments, stripeCustomerId }, stripeEnabled] =
    await Promise.all([loadBilling(user.id), isStripeBillingEnabled()]);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:billing.pageTitle'} />}
        description={<Trans i18nKey={'lms:billing.pageDescription'} />}
      />
      <PageBody>
        <Suspense>
          <BillingPanel
            context={context}
            upgradePlans={upgradePlans}
            payments={payments as Parameters<typeof BillingPanel>[0]['payments']}
            stripeEnabled={stripeEnabled}
            stripeCustomerId={stripeCustomerId}
          />
        </Suspense>
      </PageBody>
    </>
  );
}

export default withI18n(BillingPage);
