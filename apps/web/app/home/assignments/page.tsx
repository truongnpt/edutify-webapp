import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import {
  loadAssignmentFormOptions,
  loadAssignments,
} from '~/lib/lms/assignments/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { AssignmentsList } from './_components/assignments-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:assignments.pageTitle'),
  };
};

async function AssignmentsPage() {
  const user = await requireUserInServerComponent();

  const [{ context, assignments }, { exams, students }] = await Promise.all([
    loadAssignments(user.id),
    loadAssignmentFormOptions(user.id),
  ]);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:assignments.pageTitle'} />}
        description={<Trans i18nKey={'lms:assignments.pageDescription'} />}
      />

      <PageBody>
        <AssignmentsList
          context={context}
          assignments={assignments}
          exams={exams}
          students={students}
        />
      </PageBody>
    </>
  );
}

export default withI18n(AssignmentsPage);
