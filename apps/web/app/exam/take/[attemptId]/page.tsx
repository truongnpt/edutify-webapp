import { notFound } from 'next/navigation';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadAttemptForTaking } from '~/lib/lms/attempts/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import pathsConfig from '~/config/paths.config';

import type { ComponentProps } from 'react';

import { ExamTakingPanel } from './_components/exam-taking-panel';

type ExamTakingPanelProps = ComponentProps<typeof ExamTakingPanel>;

interface ExamTakePageProps {
  params: Promise<{ attemptId: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:attempt.pageTitle') };
};

async function ExamTakePage({ params }: ExamTakePageProps) {
  const { attemptId } = await params;
  const user = await requireUserInServerComponent();

  try {
    const {
      context,
      attempt,
      sections,
      answersMap,
      expiresAt,
      questionResults,
      autoSubmitted,
    } = await loadAttemptForTaking(user.id, attemptId);

    if (!attempt.exam || typeof attempt.exam !== 'object') {
      notFound();
    }

    const backHref =
      context.membership.role === 'student' ?
        pathsConfig.app.myExams
      : pathsConfig.app.exams;

    return (
      <div className={'bg-background min-h-screen px-4'}>
        <ExamTakingPanel
          attemptId={attemptId}
          exam={attempt.exam}
          attempt={{
            status: attempt.status,
            score: attempt.score,
            max_score: attempt.max_score,
            started_at: attempt.started_at,
            submitted_at: attempt.submitted_at,
          }}
          sections={
            sections as unknown as ExamTakingPanelProps['sections']
          }
          initialAnswers={
            Object.fromEntries(
              Object.entries(answersMap).map(([k, v]) => [
                k,
                (v ?? {}) as Record<string, unknown>,
              ]),
            )
          }
          expiresAt={expiresAt}
          questionResults={questionResults}
          backHref={backHref}
          initialAutoSubmitted={autoSubmitted}
        />
      </div>
    );
  } catch {
    notFound();
  }
}

export default withI18n(ExamTakePage);
