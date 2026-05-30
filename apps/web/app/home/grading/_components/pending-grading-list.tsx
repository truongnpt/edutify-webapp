'use client';

import Link from 'next/link';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';

interface PendingAttemptItem {
  id: string;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  examTitle: string;
  studentName: string;
  studentEmail: string;
}

interface PendingGradingListProps {
  attempts: PendingAttemptItem[];
}

export function PendingGradingList({ attempts }: PendingGradingListProps) {
  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className={'py-12 text-center'}>
          <p className={'text-muted-foreground text-sm'}>
            <Trans i18nKey={'lms:grading.empty'} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={'flex flex-col gap-3'}>
      {attempts.map((attempt) => (
        <Card key={attempt.id}>
          <CardHeader className={'flex flex-row items-start justify-between gap-4'}>
            <div className={'flex flex-col gap-1'}>
              <CardTitle className={'text-base'}>{attempt.examTitle}</CardTitle>
              <p className={'text-muted-foreground text-sm'}>
                {attempt.studentName} · {attempt.studentEmail}
              </p>
              {attempt.submitted_at && (
                <p className={'text-muted-foreground text-xs'}>
                  {new Date(attempt.submitted_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className={'flex items-center gap-2'}>
              <Badge variant={'secondary'}>
                <Trans i18nKey={'lms:grading.pending'} />
              </Badge>
              <Button asChild size={'sm'}>
                <Link href={`${pathsConfig.app.grading}/${attempt.id}`}>
                  <Trans i18nKey={'lms:grading.gradeButton'} />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
