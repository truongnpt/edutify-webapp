import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadPendingGradingAttempts } from '~/lib/lms/attempts/grading-server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { PendingGradingList } from './_components/pending-grading-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:grading.pageTitle'),
  };
};

async function GradingPage() {
  const user = await requireUserInServerComponent();
  const { attempts } = await loadPendingGradingAttempts(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:grading.pageTitle'} />}
        description={<Trans i18nKey={'lms:grading.pageDescription'} />}
      />

      <PageBody>
        <PendingGradingList attempts={attempts} />
      </PageBody>
    </>
  );
}

export default withI18n(GradingPage);
