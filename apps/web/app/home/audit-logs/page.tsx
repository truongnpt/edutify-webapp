import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadAuditLogs } from '~/lib/lms/audit-logs/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { AuditLogsPanel } from './_components/audit-logs-panel';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('lms:auditLogs.pageTitle') };
};

async function AuditLogsPage() {
  const user = await requireUserInServerComponent();
  const { logs } = await loadAuditLogs(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:auditLogs.pageTitle'} />}
        description={<Trans i18nKey={'lms:auditLogs.pageDescription'} />}
      />
      <PageBody>
        <AuditLogsPanel logs={logs} />
      </PageBody>
    </>
  );
}

export default withI18n(AuditLogsPage);
