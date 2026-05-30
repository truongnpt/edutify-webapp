'use client';

import { useTransition } from 'react';

import { Clock, Loader2, PenLine, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import type { AssignmentWindowStatus } from '~/lib/lms/assignments/schemas/assignment.schema';
import { startAttemptAction } from '~/lib/lms/attempts/server-actions';

interface MyExamAssignment {
  id: string;
  exam_id: string;
  start_time: string;
  end_time: string;
  window_status: AssignmentWindowStatus;
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    pass_score: number;
    status: string;
  } | null;
  attempt: {
    id: string;
    status: string;
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
  } | null;
}

interface MyExamsListProps {
  assignments: MyExamAssignment[];
}

const STATUS_VARIANT: Record<
  AssignmentWindowStatus,
  'default' | 'secondary' | 'outline'
> = {
  upcoming: 'secondary',
  active: 'default',
  ended: 'outline',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function MyExamsList({ assignments }: MyExamsListProps) {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const startOrContinue = (assignment: MyExamAssignment) => {
    if (!assignment.exam) return;

    startTransition(async () => {
      try {
        const result = await startAttemptAction({
          examId: assignment.exam_id,
          assignmentId: assignment.id,
        });

        if (result?.attemptId) {
          router.push(`${pathsConfig.app.examTake}/${result.attemptId}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.startExamFailed'),
        );
      }
    });
  };

  const viewResult = (attemptId: string) => {
    router.push(`${pathsConfig.app.examTake}/${attemptId}`);
  };

  const renderAction = (assignment: MyExamAssignment) => {
    const attempt = assignment.attempt;

    if (attempt && (attempt.status === 'submitted' || attempt.status === 'graded')) {
      return (
        <Button variant={'outline'} onClick={() => viewResult(attempt.id)}>
          <Trans i18nKey={'lms:myExams.viewResult'} />
        </Button>
      );
    }

    if (attempt?.status === 'in_progress') {
      return (
        <Button onClick={() => viewResult(attempt.id)} disabled={pending}>
          <Trans i18nKey={'lms:myExams.continue'} />
        </Button>
      );
    }

    if (assignment.window_status === 'upcoming') {
      return (
        <Button disabled>
          <Trans i18nKey={'lms:myExams.notYetAvailable'} />
        </Button>
      );
    }

    if (assignment.window_status === 'ended') {
      return (
        <Button disabled variant={'outline'}>
          <Trans i18nKey={'lms:myExams.expired'} />
        </Button>
      );
    }

    return (
      <Button onClick={() => startOrContinue(assignment)} disabled={pending}>
        {pending ?
          <Loader2 className={'mr-2 size-4 animate-spin'} />
        : <Play className={'mr-2 size-4'} />}
        <Trans i18nKey={'lms:myExams.start'} />
      </Button>
    );
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className={'flex flex-col items-center gap-4 py-12'}>
          <PenLine className={'text-muted-foreground size-12'} />
          <p className={'text-muted-foreground text-sm'}>
            <Trans i18nKey={'lms:myExams.empty'} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={'grid gap-4 md:grid-cols-2'}>
      {assignments.map((assignment) => (
        <Card key={assignment.id}>
          <CardHeader className={'flex flex-col gap-2'}>
            <div className={'flex items-start justify-between gap-2'}>
              <CardTitle className={'text-base'}>
                {assignment.exam?.title ?? '—'}
              </CardTitle>
              <Badge variant={STATUS_VARIANT[assignment.window_status]}>
                <Trans
                  i18nKey={`lms:assignments.status.${assignment.window_status}`}
                />
              </Badge>
            </div>
            {assignment.exam?.description && (
              <CardDescription>{assignment.exam.description}</CardDescription>
            )}
          </CardHeader>

          <CardContent className={'flex flex-col gap-4'}>
            <div className={'text-muted-foreground flex flex-col gap-1 text-sm'}>
              <p className={'flex items-center gap-2'}>
                <Clock className={'size-4'} />
                {assignment.exam?.duration_minutes ?? 0} min ·{' '}
                <Trans i18nKey={'lms:myExams.passScore'} />:{' '}
                {assignment.exam?.pass_score ?? 0}%
              </p>
              <p>
                <Trans i18nKey={'lms:assignments.startTimeLabel'} />:{' '}
                {formatDateTime(assignment.start_time)}
              </p>
              <p>
                <Trans i18nKey={'lms:assignments.endTimeLabel'} />:{' '}
                {formatDateTime(assignment.end_time)}
              </p>
              {assignment.attempt?.status === 'graded' &&
                assignment.attempt.score != null && (
                  <p className={'text-foreground font-medium'}>
                    <Trans i18nKey={'lms:myExams.score'} />:{' '}
                    {assignment.attempt.score} /{' '}
                    {assignment.attempt.max_score ?? '—'}
                  </p>
                )}
            </div>

            {renderAction(assignment)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
