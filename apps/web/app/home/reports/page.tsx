import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadReports } from '~/lib/lms/reports/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { ReportsView } from './_components/reports-view';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:reports.pageTitle'),
  };
};

async function ReportsPage() {
  const user = await requireUserInServerComponent();
  const { role, examReports, studentReports } = await loadReports(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:reports.pageTitle'} />}
        description={<Trans i18nKey={'lms:reports.pageDescription'} />}
      />

      <PageBody>
        <ReportsView
          role={role}
          examReports={examReports}
          studentReports={studentReports}
        />
      </PageBody>
    </>
  );
}

export default withI18n(ReportsPage);
