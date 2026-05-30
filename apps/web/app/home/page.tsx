import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadDashboardStats } from '~/lib/lms/dashboard/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { LmsDashboard } from './_components/lms-dashboard';
import { QuotaBanner } from './_components/quota-banner';
import { loadQuotaStatus } from '~/lib/lms/quota/load-quota-status';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:dashboard.pageTitle'),
  };
};

async function HomePage() {
  const user = await requireUserInServerComponent();
  const [{ role, stats }, quota] = await Promise.all([
    loadDashboardStats(user.id),
    loadQuotaStatus(user.id),
  ]);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:dashboard.pageTitle'} />}
        description={<Trans i18nKey={'lms:dashboard.pageDescription'} />}
      />

      <PageBody>
        <div className={'flex flex-col gap-6'}>
          {role !== 'student' && (
            <QuotaBanner
              items={quota.items}
              showBillingLink={quota.isOwner}
            />
          )}
          <LmsDashboard role={role} stats={stats} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(HomePage);
