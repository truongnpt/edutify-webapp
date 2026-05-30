import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import {
  isPlatformAdminClient,
  loadPendingPayments,
} from '~/lib/lms/billing/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { AdminPaymentsPanel } from './_components/admin-payments-panel';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:adminPayments.pageTitle') };
};

async function AdminPaymentsPage() {
  const user = await requireUserInServerComponent();
  const isAdmin = await isPlatformAdminClient();

  if (!isAdmin) {
    notFound();
  }

  const { payments } = await loadPendingPayments(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:adminPayments.pageTitle'} />}
        description={<Trans i18nKey={'lms:adminPayments.pageDescription'} />}
      />
      <PageBody>
        <AdminPaymentsPanel payments={payments} />
      </PageBody>
    </>
  );
}

export default withI18n(AdminPaymentsPage);
