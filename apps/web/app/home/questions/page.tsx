import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadQuestionBanks } from '~/lib/lms/questions/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { QuestionBanksList } from './_components/question-banks-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:questions.pageTitle'),
  };
};

async function QuestionBanksPage() {
  const user = await requireUserInServerComponent();
  const { context, banks } = await loadQuestionBanks(user.id);

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:questions.pageTitle'} />}
        description={<Trans i18nKey={'lms:questions.pageDescription'} />}
      />

      <PageBody>
        <QuestionBanksList context={context} banks={banks} />
      </PageBody>
    </>
  );
}

export default withI18n(QuestionBanksPage);
