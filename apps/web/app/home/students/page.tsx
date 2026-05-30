import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadStudents } from '~/lib/lms/students/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { StudentsList } from './_components/students-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:students.pageTitle'),
  };
};

async function StudentsPage() {
  const user = await requireUserInServerComponent();
  const { context, students } = await loadStudents(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:students.pageTitle'} />}
        description={<Trans i18nKey={'lms:students.pageDescription'} />}
      />

      <PageBody>
        <StudentsList context={context} students={students} />
      </PageBody>
    </>
  );
}

export default withI18n(StudentsPage);
