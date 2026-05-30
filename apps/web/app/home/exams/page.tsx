import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadExams } from '~/lib/lms/exams/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { ExamsList } from './_components/exams-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:exams.pageTitle') };
};

async function ExamsPage() {
  const user = await requireUserInServerComponent();
  const { context, exams } = await loadExams(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:exams.pageTitle'} />}
        description={<Trans i18nKey={'lms:exams.pageDescription'} />}
      />
      <PageBody>
        <ExamsList context={context} exams={exams} />
      </PageBody>
    </>
  );
}

export default withI18n(ExamsPage);
