'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import {
  criterionMaxScore,
  getRubricCriteria,
  parseGradingFeedback,
} from '~/lib/lms/attempts/grading-feedback';
import {
  GradeManualAnswerSchema,
  type GradeManualAnswerInput,
} from '~/lib/lms/attempts/schemas/grading.schema';
import {
  finalizeAttemptGradingAction,
  gradeManualAnswerAction,
} from '~/lib/lms/attempts/grading-server-actions';
import { getAttemptUploadSignedUrl } from '~/lib/lms/attempts/server-actions';

interface PendingAnswerItem {
  id: string;
  questionId: string;
  answerData: Record<string, unknown>;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  feedback: string | null;
  question: {
    content: string;
    questionType: string;
    explanation: string | null;
    scoringSchema: Record<string, unknown> | null;
  } | null;
}

interface GradingPanelProps {
  attemptId: string;
  examTitle: string;
  studentName: string;
  pendingAnswers: PendingAnswerItem[];
}

function formatStudentAnswer(
  answerData: Record<string, unknown>,
  questionType?: string,
) {
  if (
    questionType === 'file_upload' ||
    questionType === 'audio_response' ||
    questionType === 'spreadsheet_task'
  ) {
    const fileName = answerData.fileName;

    return fileName ? String(fileName) : '—';
  }

  const text = answerData.text ?? answerData.value;

  return text ? String(text) : JSON.stringify(answerData);
}

function FileAnswerLink({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getAttemptUploadSignedUrl(filePath)
      .then((result) => setUrl(result.url))
      .catch(() => setUrl(null));
  }, [filePath]);

  if (url) {
    return (
      <a
        href={url}
        target={'_blank'}
        rel={'noopener noreferrer'}
        className={'text-primary underline'}
      >
        {fileName}
      </a>
    );
  }

  return <span>{fileName}</span>;
}

function buildRubricScores(
  criteriaCount: number,
  existing?: Array<{ index: number; score: number }>,
) {
  return Array.from({ length: criteriaCount }, (_, index) => {
    const found = existing?.find((item) => item.index === index);

    return {
      index,
      score: found?.score ?? 0,
    };
  });
}

export function GradingPanel({
  attemptId,
  examTitle,
  studentName,
  pendingAnswers: initialPending,
}: GradingPanelProps) {
  const { t } = useTranslation('lms');
  const [pendingAnswers, setPendingAnswers] = useState(initialPending);
  const [pending, startTransition] = useTransition();

  const form = useForm<GradeManualAnswerInput>({
    resolver: zodResolver(GradeManualAnswerSchema),
    defaultValues: {
      answerId: '',
      score: 0,
      maxScore: 1,
      isCorrect: false,
      feedback: '',
      rubricScores: [],
    },
  });

  const selectAnswer = (answer: PendingAnswerItem) => {
    const criteria = getRubricCriteria(answer.question?.scoringSchema);
    const parsedFeedback = parseGradingFeedback(answer.feedback);

    form.reset({
      answerId: answer.id,
      score: answer.score,
      maxScore: answer.maxScore,
      isCorrect: answer.isCorrect ?? false,
      feedback: parsedFeedback.comment ?? '',
      rubricScores:
        criteria.length > 0 ?
          buildRubricScores(criteria.length, parsedFeedback.rubricScores)
        : undefined,
    });
  };

  const onGrade = (data: GradeManualAnswerInput) => {
    startTransition(async () => {
      try {
        await gradeManualAnswerAction(data);
        setPendingAnswers((prev) =>
          prev.filter((answer) => answer.id !== data.answerId),
        );
        toast.success(t('toast.answerGraded'));
        form.reset({
          answerId: '',
          score: 0,
          maxScore: 1,
          isCorrect: false,
          feedback: '',
          rubricScores: [],
        });
      } catch {
        toast.error(t('toast.gradeAnswerFailed'));
      }
    });
  };

  const onFinalize = () => {
    if (!confirm(t('grading.finalizeConfirm'))) return;

    startTransition(async () => {
      try {
        await finalizeAttemptGradingAction({ attemptId });
        toast.success(t('toast.gradingFinalized'));
        window.location.href = pathsConfig.app.grading;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('toast.finalizeFailed');
        toast.error(message);
      }
    });
  };

  const selectedId = form.watch('answerId');
  const selectedAnswer = pendingAnswers.find((a) => a.id === selectedId);
  const rubricCriteria = useMemo(
    () => getRubricCriteria(selectedAnswer?.question?.scoringSchema),
    [selectedAnswer?.question?.scoringSchema],
  );
  const hasRubric = rubricCriteria.length > 0;
  const perCriterionMax = useMemo(
    () =>
      hasRubric ?
        criterionMaxScore(form.watch('maxScore'), rubricCriteria.length)
      : 0,
    [hasRubric, rubricCriteria.length, form.watch('maxScore')],
  );

  const updateRubricScore = (index: number, score: number) => {
    const current = form.getValues('rubricScores') ?? [];
    const next = buildRubricScores(rubricCriteria.length, current);
    next[index] = { index, score };
    form.setValue('rubricScores', next, { shouldDirty: true });
    const total = next.reduce((sum, item) => sum + item.score, 0);
    form.setValue('score', total, { shouldDirty: true });
  };

  return (
    <div className={'flex flex-col gap-6'}>
      <div className={'flex items-center gap-4'}>
        <Button variant={'ghost'} size={'sm'} asChild>
          <Link href={pathsConfig.app.grading}>
            <ArrowLeft className={'mr-2 size-4'} />
            <Trans i18nKey={'lms:common.back'} />
          </Link>
        </Button>
        <div>
          <h2 className={'text-lg font-semibold'}>{examTitle}</h2>
          <p className={'text-muted-foreground text-sm'}>{studentName}</p>
        </div>
      </div>

      {pendingAnswers.length === 0 ? (
        <Card>
          <CardContent className={'flex flex-col items-center gap-4 py-12'}>
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:grading.allGraded'} />
            </p>
            <Button onClick={onFinalize} disabled={pending}>
              <Trans i18nKey={'lms:grading.finalize'} />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={'grid gap-6 lg:grid-cols-2'}>
          <div className={'flex flex-col gap-3'}>
            {pendingAnswers.map((answer) => {
              const criteria = getRubricCriteria(answer.question?.scoringSchema);

              return (
                <Card
                  key={answer.id}
                  className={
                    selectedId === answer.id ?
                      'border-primary ring-1 ring-primary'
                    : undefined
                  }
                >
                  <CardHeader className={'pb-2'}>
                    <div className={'flex items-center gap-2'}>
                      <Badge variant={'outline'}>{answer.question?.questionType}</Badge>
                      {selectedId === answer.id && (
                        <Badge>
                          <Trans i18nKey={'lms:grading.selected'} />
                        </Badge>
                      )}
                    </div>
                    <CardTitle className={'text-base font-normal'}>
                      {answer.question?.content}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={'flex flex-col gap-3'}>
                    <div className={'bg-muted/50 rounded-md border p-3 text-sm whitespace-pre-wrap'}>
                      {(answer.question?.questionType === 'file_upload' ||
                        answer.question?.questionType === 'audio_response' ||
                        answer.question?.questionType === 'spreadsheet_task') &&
                      answer.answerData.filePath &&
                      answer.answerData.fileName ?
                        <FileAnswerLink
                          filePath={String(answer.answerData.filePath)}
                          fileName={String(answer.answerData.fileName)}
                        />
                      : formatStudentAnswer(
                          answer.answerData,
                          answer.question?.questionType,
                        )}
                    </div>
                    {criteria.length > 0 && (
                      <div className={'flex flex-col gap-1'}>
                        <p className={'text-sm font-medium'}>
                          <Trans i18nKey={'lms:grading.rubricTitle'} />
                        </p>
                        <ul className={'text-muted-foreground list-inside list-disc text-sm'}>
                          {criteria.map((criterion, index) => (
                            <li key={`${answer.id}-${index}`}>
                              {criterion}{' '}
                              <span className={'text-xs'}>
                                (
                                <Trans
                                  i18nKey={'lms:grading.criterionMax'}
                                  values={{
                                    max: criterionMaxScore(
                                      answer.maxScore,
                                      criteria.length,
                                    ).toFixed(2),
                                  }}
                                />
                                )
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button
                      variant={'outline'}
                      size={'sm'}
                      onClick={() => selectAnswer(answer)}
                    >
                      <Trans i18nKey={'lms:grading.gradeThis'} />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className={'text-base'}>
                <Trans i18nKey={'lms:grading.gradeFormTitle'} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAnswer ?
                <p className={'text-muted-foreground text-sm'}>
                  <Trans i18nKey={'lms:grading.selectAnswer'} />
                </p>
              : <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onGrade)}
                    className={'flex flex-col gap-4'}
                  >
                    {hasRubric ?
                      <div className={'flex flex-col gap-3'}>
                        <p className={'text-sm font-medium'}>
                          <Trans i18nKey={'lms:grading.rubricScoresTitle'} />
                        </p>
                        {rubricCriteria.map((criterion, index) => (
                          <div key={index} className={'flex flex-col gap-1'}>
                            <label className={'text-sm'}>
                              {criterion}{' '}
                              <span className={'text-muted-foreground text-xs'}>
                                (
                                <Trans
                                  i18nKey={'lms:grading.criterionMax'}
                                  values={{ max: perCriterionMax.toFixed(2) }}
                                />
                                )
                              </span>
                            </label>
                            <Input
                              type={'number'}
                              min={0}
                              max={perCriterionMax}
                              step={0.5}
                              value={
                                form.watch('rubricScores')?.[index]?.score ?? 0
                              }
                              onChange={(event) =>
                                updateRubricScore(
                                  index,
                                  Number(event.target.value),
                                )
                              }
                            />
                          </div>
                        ))}
                        <FormField
                          control={form.control}
                          name={'score'}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <Trans i18nKey={'lms:grading.totalScoreLabel'} />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type={'number'}
                                  readOnly
                                  className={'bg-muted'}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    : <FormField
                        control={form.control}
                        name={'score'}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Trans i18nKey={'lms:grading.scoreLabel'} />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type={'number'}
                                min={0}
                                max={form.watch('maxScore')}
                                step={0.5}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    }

                    <FormField
                      control={form.control}
                      name={'maxScore'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:grading.maxScoreLabel'} />
                          </FormLabel>
                          <FormControl>
                            <Input
                              type={'number'}
                              min={0}
                              step={0.5}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={'isCorrect'}
                      render={({ field }) => (
                        <FormItem className={'flex items-center gap-2'}>
                          <FormControl>
                            <input
                              type={'checkbox'}
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className={'size-4'}
                            />
                          </FormControl>
                          <FormLabel className={'!mt-0'}>
                            <Trans i18nKey={'lms:grading.markCorrect'} />
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={'feedback'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:grading.feedbackLabel'} />
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type={'submit'} disabled={pending}>
                      <Trans i18nKey={'lms:grading.saveGrade'} />
                    </Button>
                  </form>
                </Form>
              }
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
