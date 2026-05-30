import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadQuestionGroupsForBank } from '~/lib/lms/question-groups/server-actions';
import { loadQuestionBankDetail } from '~/lib/lms/questions/server-actions';
import { loadTags } from '~/lib/lms/tags/server-actions';
import type { Question } from '~/lib/lms/types';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { QuestionBankTabs } from './_components/question-bank-tabs';

interface QuestionBankDetailPageProps {
  params: Promise<{ bankId: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:questions.bankDetailTitle'),
  };
};

async function QuestionBankDetailPage({ params }: QuestionBankDetailPageProps) {
  const { bankId } = await params;
  const user = await requireUserInServerComponent();

  try {
    const [{ bank, questions }, { tags }, { groups, groupedQuestions }] =
      await Promise.all([
        loadQuestionBankDetail(user.id, bankId),
        loadTags(user.id),
        loadQuestionGroupsForBank(user.id, bankId),
      ]);

    return (
      <>
        <PageHeader
          title={<Trans i18nKey={'lms:questions.bankDetailTitle'} />}
          description={bank.name}
        />

        <PageBody>
          <QuestionBankTabs
            bank={bank}
            questions={questions as Question[]}
            availableTags={tags}
            groups={groups}
            groupedQuestions={groupedQuestions}
          />
        </PageBody>
      </>
    );
  } catch {
    notFound();
  }
}

export default withI18n(QuestionBankDetailPage);
