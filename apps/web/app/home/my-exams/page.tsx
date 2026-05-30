import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadMyAssignments } from '~/lib/lms/assignments/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { MyExamsList } from './_components/my-exams-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:myExams.pageTitle'),
  };
};

async function MyExamsPage() {
  const user = await requireUserInServerComponent();
  const email = user.email ?? `${user.id}@student.local`;
  const displayName = user.email?.split('@')[0] ?? 'Student';

  const { assignments, studentLinked } = await loadMyAssignments(
    user.id,
    email,
    displayName,
  );

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:myExams.pageTitle'} />}
        description={<Trans i18nKey={'lms:myExams.pageDescription'} />}
      />

      <PageBody>
        {!studentLinked && (
          <p className={'text-muted-foreground mb-4 text-sm'}>
            <Trans i18nKey={'lms:myExams.notLinked'} />
          </p>
        )}
        <MyExamsList assignments={assignments} />
      </PageBody>
    </>
  );
}

export default withI18n(MyExamsPage);
