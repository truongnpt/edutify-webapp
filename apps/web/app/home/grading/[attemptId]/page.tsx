import { notFound } from 'next/navigation';

import { PageBody } from '@kit/ui/page';

import { loadAttemptForGrading } from '~/lib/lms/attempts/grading-server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { withI18n } from '~/lib/i18n/with-i18n';

import { GradingPanel } from './_components/grading-panel';

interface GradingDetailPageProps {
  params: Promise<{ attemptId: string }>;
}

async function GradingDetailPage({ params }: GradingDetailPageProps) {
  const { attemptId } = await params;
  const user = await requireUserInServerComponent();

  try {
    const { attempt, pendingAnswers } = await loadAttemptForGrading(
      user.id,
      attemptId,
    );

    if (attempt.status !== 'submitted') {
      notFound();
    }

    const examTitle =
      attempt.exam && typeof attempt.exam === 'object' ?
        (attempt.exam as { title: string }).title
      : '—';
    const studentName =
      attempt.student && typeof attempt.student === 'object' ?
        (attempt.student as { full_name: string }).full_name
      : '—';

    return (
      <PageBody>
        <GradingPanel
          attemptId={attemptId}
          examTitle={examTitle}
          studentName={studentName}
          pendingAnswers={pendingAnswers}
        />
      </PageBody>
    );
  } catch {
    notFound();
  }
}

export default withI18n(GradingDetailPage);
