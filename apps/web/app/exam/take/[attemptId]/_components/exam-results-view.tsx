'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';

export interface QuestionResultItem {
  questionId: string;
  content: string;
  questionType: string;
  sectionTitle: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  maxScore: number | null;
  explanation: string | null;
}

interface ExamResultsViewProps {
  examTitle: string;
  totalScore: number;
  maxScore: number;
  passScore: number;
  status: string;
  autoSubmitted?: boolean;
  backHref: string;
  questionResults: QuestionResultItem[];
}

export function ExamResultsView({
  examTitle,
  totalScore,
  maxScore,
  passScore,
  status,
  autoSubmitted,
  backHref,
  questionResults,
}: ExamResultsViewProps) {
  const passed =
    maxScore > 0 ? (totalScore / maxScore) * 100 >= passScore : false;

  return (
    <div className={'mx-auto flex max-w-3xl flex-col gap-6 py-8'}>
      <Card>
        <CardHeader className={'text-center'}>
          <CheckCircle2
            className={'mx-auto size-12 text-green-600 dark:text-green-400'}
          />
          <CardTitle>
            <Trans i18nKey={'lms:attempt.submittedTitle'} />
          </CardTitle>
          <p className={'text-muted-foreground text-sm'}>{examTitle}</p>
        </CardHeader>
        <CardContent className={'flex flex-col items-center gap-4 text-center'}>
          <p className={'text-3xl font-bold'}>
            {totalScore} / {maxScore}
          </p>
          <Badge variant={passed ? 'default' : 'destructive'}>
            {passed ?
              <Trans i18nKey={'lms:attempt.passed'} />
            : <Trans i18nKey={'lms:attempt.failed'} />}
          </Badge>
          {autoSubmitted && (
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:attempt.autoSubmitted'} />
            </p>
          )}
          {status === 'submitted' && (
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:attempt.manualReviewPending'} />
            </p>
          )}
        </CardContent>
      </Card>

      {questionResults.length > 0 && (
        <>
          <h2 className={'text-lg font-semibold'}>
            <Trans i18nKey={'lms:attempt.resultsDetail'} />
          </h2>

          <div className={'flex flex-col gap-4'}>
            {questionResults.map((item) => (
              <Card key={item.questionId}>
                <CardHeader className={'pb-2'}>
                  <div className={'flex items-start justify-between gap-2'}>
                    <div className={'flex flex-col gap-1'}>
                      <span className={'text-muted-foreground text-xs'}>
                        {item.sectionTitle}
                      </span>
                      <CardTitle className={'text-base font-normal'}>
                        {item.content}
                      </CardTitle>
                    </div>
                    {item.isCorrect === true && (
                      <CheckCircle2 className={'size-5 shrink-0 text-green-600'} />
                    )}
                    {item.isCorrect === false && (
                      <XCircle className={'size-5 shrink-0 text-destructive'} />
                    )}
                    {item.isCorrect === null && (
                      <Badge variant={'secondary'}>
                        <Trans i18nKey={'lms:attempt.pendingReview'} />
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={'flex flex-col gap-2 text-sm'}>
                  <p>
                    <span className={'text-muted-foreground'}>
                      <Trans i18nKey={'lms:attempt.yourAnswer'} />:{' '}
                    </span>
                    {item.studentAnswer}
                  </p>
                  {item.correctAnswer && item.isCorrect !== null && (
                    <p>
                      <span className={'text-muted-foreground'}>
                        <Trans i18nKey={'lms:attempt.correctAnswer'} />:{' '}
                      </span>
                      {item.correctAnswer}
                    </p>
                  )}
                  {item.score != null && item.maxScore != null && (
                    <p className={'text-muted-foreground'}>
                      <Trans i18nKey={'lms:attempt.questionScore'} />:{' '}
                      {item.score} / {item.maxScore}
                    </p>
                  )}
                  {item.explanation && (
                    <p className={'bg-muted/50 rounded-md border p-3'}>
                      {item.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Separator />

      <div className={'flex justify-center'}>
        <Button asChild variant={'outline'}>
          <Link href={backHref}>
            <Trans i18nKey={'lms:common.back'} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
