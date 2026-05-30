'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { ArrowDown, ArrowUp, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';

import {
  logAttemptEventAction,
  saveAnswerAction,
  submitAttemptAction,
  uploadAttemptAnswerFile,
} from '~/lib/lms/attempts/server-actions';

import { Trans } from '@kit/ui/trans';

import { getQuestionMediaUrl, getUploadFileCategory } from '~/lib/lms/questions/question-form-utils';

import {
  ExamResultsView,
  type QuestionResultItem,
} from './exam-results-view';
import { ExamTimer } from './exam-timer';

const AUTO_SAVE_MS = 10_000;

interface ExamQuestion {
  id: string;
  title: string | null;
  content: string;
  question_type: string;
  answer_schema?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface SectionItem {
  id: string;
  question_id: string | null;
  question_group_id: string | null;
  score: number;
  question?: ExamQuestion | null;
  question_group?: {
    id: string;
    title: string;
    group_type: string;
    shared_content: string | null;
  } | null;
  groupQuestions?: ExamQuestion[];
}

interface ExamTakingPanelProps {
  attemptId: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    pass_score: number;
  };
  attempt: {
    status: string;
    score: number | null;
    max_score: number | null;
    started_at: string | null;
    submitted_at: string | null;
  };
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    items: SectionItem[];
  }>;
  initialAnswers: Record<string, Record<string, unknown>>;
  expiresAt: string | null;
  questionResults: QuestionResultItem[];
  backHref: string;
  initialAutoSubmitted?: boolean;
}

function flattenQuestions(sections: ExamTakingPanelProps['sections']) {
  const result: Array<{
    question: ExamQuestion;
    sectionTitle: string;
    groupTitle?: string;
    groupContent?: string | null;
  }> = [];

  for (const section of sections) {
    for (const item of section.items) {
      if (item.question) {
        result.push({
          question: item.question as ExamQuestion,
          sectionTitle: section.title,
        });
      }

      if (item.question_group && item.groupQuestions?.length) {
        for (const q of item.groupQuestions) {
          result.push({
            question: q as ExamQuestion,
            sectionTitle: section.title,
            groupTitle: item.question_group.title,
            groupContent: item.question_group.shared_content,
          });
        }
      }
    }
  }

  return result;
}

export function ExamTakingPanel({
  attemptId,
  exam,
  attempt,
  sections,
  initialAnswers,
  expiresAt,
  questionResults: initialQuestionResults,
  backHref,
  initialAutoSubmitted = false,
}: ExamTakingPanelProps) {
  const { t } = useTranslation('lms');
  const [answers, setAnswers] =
    useState<Record<string, Record<string, unknown>>>(initialAnswers);
  const [pending, startTransition] = useTransition();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitted, setSubmitted] = useState(
    attempt.status === 'graded' || attempt.status === 'submitted',
  );
  const [autoSubmitted, setAutoSubmitted] = useState(initialAutoSubmitted);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [result, setResult] = useState<{
    totalScore: number;
    maxScore: number;
    status: string;
  } | null>(
    submitted && attempt.score != null ?
      {
        totalScore: Number(attempt.score),
        maxScore: Number(attempt.max_score ?? 0),
        status: attempt.status,
      }
    : null,
  );
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  const questions = useMemo(() => flattenQuestions(sections), [sections]);

  const saveAllAnswers = useCallback(async () => {
    const current = answersRef.current;
    const entries = Object.entries(current);

    if (entries.length === 0) return;

    await Promise.all(
      entries.map(([questionId, answerData]) =>
        saveAnswerAction({ attemptId, questionId, answerData }),
      ),
    );

    setLastSaved(new Date());
  }, [attemptId]);

  useEffect(() => {
    if (submitted) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        void logAttemptEventAction({ attemptId, event: 'tab_switch' })
          .then((res) => {
            setTabSwitchCount(res.tabSwitchCount);

            if (res.tabSwitchCount >= 3) {
              toast.warning('Please stay on the exam tab');
            }
          })
          .catch(() => undefined);
      }
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      void logAttemptEventAction({ attemptId, event: 'copy_blocked' }).catch(
        () => undefined,
      );
      toast.warning('Copy is disabled during the exam');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
    };
  }, [attemptId, submitted]);

  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
      void saveAllAnswers().catch(() => {
        toast.error(t('toast.autoSaveFailed'));
      });
    }, AUTO_SAVE_MS);

    return () => clearInterval(interval);
  }, [submitted, saveAllAnswers]);

  const submitInternal = useCallback(
    (options?: { autoSubmit?: boolean; skipConfirm?: boolean }) => {
      if (submittingRef.current || submitted) return;

      if (!options?.skipConfirm && !options?.autoSubmit) {
        if (
          !confirm('Submit exam? You cannot change answers after submitting.')
        ) {
          return;
        }
      }

      submittingRef.current = true;

      startTransition(async () => {
        try {
          await saveAllAnswers();
          const res = await submitAttemptAction({
            attemptId,
            autoSubmit: options?.autoSubmit,
          });
          setSubmitted(true);
          setAutoSubmitted(Boolean(options?.autoSubmit));
          setResult({
            totalScore: res.totalScore,
            maxScore: res.maxScore,
            status: res.status,
          });

          if (options?.autoSubmit) {
            toast.info('Time is up — exam submitted automatically');
          } else {
            toast.success(t('toast.examSubmitted'));
          }

          window.location.reload();
        } catch {
          submittingRef.current = false;
          toast.error(t('toast.submitExamFailed'));
        }
      });
    },
    [attemptId, saveAllAnswers, submitted],
  );

  const handleExpire = useCallback(() => {
    submitInternal({ autoSubmit: true, skipConfirm: true });
  }, [submitInternal]);

  const setAnswer = (questionId: string, answerData: Record<string, unknown>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerData }));
  };

  if (submitted && result) {
    return (
      <ExamResultsView
        examTitle={exam.title}
        totalScore={result.totalScore}
        maxScore={result.maxScore}
        passScore={exam.pass_score}
        status={result.status}
        autoSubmitted={autoSubmitted}
        backHref={backHref}
        questionResults={initialQuestionResults}
      />
    );
  }

  return (
    <div className={'mx-auto flex max-w-3xl flex-col gap-6 pb-24'}>
      {tabSwitchCount >= 3 && (
        <Alert variant={'warning'}>
          <AlertTitle>
            <Trans i18nKey={'lms:attempt.tabSwitchWarningTitle'} />
          </AlertTitle>
          <AlertDescription>
            <Trans
              i18nKey={'lms:attempt.tabSwitchWarning'}
              values={{ count: tabSwitchCount }}
            />
          </AlertDescription>
        </Alert>
      )}

      <div
        className={
          'bg-background/95 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b py-4 backdrop-blur'
        }
      >
        <div>
          <h1 className={'text-xl font-semibold'}>{exam.title}</h1>
          <p className={'text-muted-foreground flex flex-wrap items-center gap-3 text-sm'}>
            <span className={'flex items-center gap-1'}>
              <Clock className={'size-4'} />
              {exam.duration_minutes} min · {questions.length} questions
            </span>
            {expiresAt && (
              <ExamTimer expiresAt={expiresAt} onExpire={handleExpire} />
            )}
          </p>
        </div>
        <div className={'flex items-center gap-3'}>
          {pending && <Loader2 className={'size-4 animate-spin'} />}
          {lastSaved && (
            <span className={'text-muted-foreground text-xs'}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={() => submitInternal()} disabled={pending}>
            <Trans i18nKey={'lms:attempt.submit'} />
          </Button>
        </div>
      </div>

      {questions.map(({ question, sectionTitle, groupTitle, groupContent }, idx) => {
        const schema = question.answer_schema ?? {};
        const options =
          (schema.options as Array<{ key: string; content: string }>) ?? [];
        const current = answers[question.id] ?? {};

        return (
          <Card key={question.id}>
            <CardHeader>
              <div className={'flex flex-col gap-2'}>
                <span className={'text-muted-foreground text-xs'}>
                  {sectionTitle}
                  {groupTitle ? ` · ${groupTitle}` : ''} · Q{idx + 1}
                </span>
                <Badge variant={'outline'} className={'w-fit'}>
                  {question.question_type}
                </Badge>
              </div>
              {groupContent && (
                <div
                  className={
                    'bg-muted/50 mt-2 rounded-md border p-4 text-sm whitespace-pre-wrap'
                  }
                >
                  {groupContent}
                </div>
              )}
              <CardTitle className={'text-base font-normal'}>
                {question.content}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(question.question_type === 'single_choice' ||
                question.question_type === 'true_false' ||
                question.question_type === 'yes_no') && (
                <RadioGroup
                  value={String(current.selected ?? current.value ?? '')}
                  onValueChange={(v) =>
                    setAnswer(question.id, { selected: v, value: v })
                  }
                >
                  {options.length > 0 ?
                    options.map((opt) => (
                      <div key={opt.key} className={'flex items-center gap-2'}>
                        <RadioGroupItem value={opt.key} id={`${question.id}-${opt.key}`} />
                        <Label htmlFor={`${question.id}-${opt.key}`}>
                          {opt.content}
                        </Label>
                      </div>
                    ))
                  : question.question_type === 'yes_no' ?
                    <>
                      <div className={'flex items-center gap-2'}>
                        <RadioGroupItem value={'yes'} id={`${question.id}-yes`} />
                        <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                      </div>
                      <div className={'flex items-center gap-2'}>
                        <RadioGroupItem value={'no'} id={`${question.id}-no`} />
                        <Label htmlFor={`${question.id}-no`}>No</Label>
                      </div>
                    </>
                  : <>
                      <div className={'flex items-center gap-2'}>
                        <RadioGroupItem value={'true'} id={`${question.id}-true`} />
                        <Label htmlFor={`${question.id}-true`}>True</Label>
                      </div>
                      <div className={'flex items-center gap-2'}>
                        <RadioGroupItem value={'false'} id={`${question.id}-false`} />
                        <Label htmlFor={`${question.id}-false`}>False</Label>
                      </div>
                    </>
                  }
                </RadioGroup>
              )}

              {question.question_type === 'multiple_choice' && (
                <div className={'flex flex-col gap-2'}>
                  {options.map((opt) => {
                    const selected = (current.selected as string[]) ?? [];

                    return (
                      <div key={opt.key} className={'flex items-center gap-2'}>
                        <Checkbox
                          id={`${question.id}-${opt.key}`}
                          checked={selected.includes(opt.key)}
                          onCheckedChange={(checked) => {
                            const next =
                              checked ?
                                [...selected, opt.key]
                              : selected.filter((k) => k !== opt.key);
                            setAnswer(question.id, { selected: next });
                          }}
                        />
                        <Label htmlFor={`${question.id}-${opt.key}`}>
                          {opt.content}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {(question.question_type === 'fill_blank' ||
                question.question_type === 'short_answer') && (
                <Input
                  value={String(current.text ?? '')}
                  onChange={(e) =>
                    setAnswer(question.id, { text: e.target.value })
                  }
                  placeholder={'Your answer'}
                />
              )}

              {(question.question_type === 'matching_pairs' ||
                question.question_type === 'matching_headings' ||
                question.question_type === 'matching_features' ||
                question.question_type === 'matching_information' ||
                question.question_type === 'image_labeling' ||
                question.question_type === 'diagram_labeling' ||
                question.question_type === 'map_labeling') && (
                <div className={'flex flex-col gap-3'}>
                  {getQuestionMediaUrl(question.metadata) && (
                    <img
                      src={getQuestionMediaUrl(question.metadata)!}
                      alt={''}
                      className={'max-h-64 rounded-md border object-contain'}
                    />
                  )}
                  {(
                    (schema.leftItems ?? []) as Array<{
                      id: string;
                      content: string;
                    }>
                  ).map((left) => {
                    const rightItems =
                      (schema.rightItems ?? []) as Array<{
                        id: string;
                        content: string;
                      }>;
                    const pairs = (current.pairs ?? {}) as Record<string, string>;

                    return (
                      <div
                        key={left.id}
                        className={'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'}
                      >
                        <span className={'min-w-32 font-medium'}>{left.content}</span>
                        <Select
                          value={pairs[left.id] ?? ''}
                          onValueChange={(value) =>
                            setAnswer(question.id, {
                              pairs: { ...pairs, [left.id]: value },
                            })
                          }
                        >
                          <SelectTrigger className={'w-full sm:max-w-xs'}>
                            <SelectValue placeholder={'Select match'} />
                          </SelectTrigger>
                          <SelectContent>
                            {rightItems.map((right) => (
                              <SelectItem key={right.id} value={right.id}>
                                {right.content}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}

              {(question.question_type === 'sequence_order' ||
                question.question_type === 'drag_drop_order') && (
                <OrderingAnswerInput
                  questionId={question.id}
                  items={
                    (schema.items ?? []) as Array<{ id: string; content: string }>
                  }
                  current={current}
                  setAnswer={setAnswer}
                />
              )}

              {(question.question_type === 'essay' ||
                question.question_type === 'paragraph_answer') && (
                <textarea
                  className={
                    'border-input bg-background flex min-h-32 w-full rounded-md border px-3 py-2 text-sm'
                  }
                  value={String(current.text ?? '')}
                  onChange={(e) =>
                    setAnswer(question.id, { text: e.target.value })
                  }
                  placeholder={'Write your answer...'}
                />
              )}

              {question.question_type === 'coding' && (
                <textarea
                  className={
                    'border-input bg-background flex min-h-48 w-full rounded-md border px-3 py-2 font-mono text-sm'
                  }
                  value={String(current.text ?? '')}
                  onChange={(e) =>
                    setAnswer(question.id, { text: e.target.value })
                  }
                  placeholder={'Write your code...'}
                  spellCheck={false}
                />
              )}

              {(question.question_type === 'file_upload' ||
                question.question_type === 'audio_response' ||
                question.question_type === 'spreadsheet_task') && (
                <FileUploadAnswerInput
                  attemptId={attemptId}
                  questionId={question.id}
                  questionType={question.question_type}
                  current={current}
                  setAnswer={setAnswer}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      <Separator />

      <div className={'flex justify-end'}>
        <Button size={'lg'} onClick={() => submitInternal()} disabled={pending}>
          <Trans i18nKey={'lms:attempt.submit'} />
        </Button>
      </div>
    </div>
  );
}

function OrderingAnswerInput({
  questionId,
  items,
  current,
  setAnswer,
}: {
  questionId: string;
  items: Array<{ id: string; content: string }>;
  current: Record<string, unknown>;
  setAnswer: (questionId: string, answerData: Record<string, unknown>) => void;
}) {
  const initialized = useRef(false);
  const savedOrder = Array.isArray(current.order)
    ? (current.order as string[])
    : null;

  useEffect(() => {
    if (initialized.current || savedOrder?.length) return;

    if (items.length > 0) {
      initialized.current = true;
      setAnswer(questionId, {
        order: [...items].reverse().map((item) => item.id),
      });
    }
  }, [questionId, items, savedOrder, setAnswer]);

  const displayOrder =
    savedOrder && savedOrder.length === items.length ?
      savedOrder
    : [...items].reverse().map((item) => item.id);
  const byId = Object.fromEntries(items.map((item) => [item.id, item.content]));

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= displayOrder.length) return;

    const next = [...displayOrder];
    const current = next[index];
    const target = next[nextIndex];

    if (!current || !target) return;

    next[index] = target;
    next[nextIndex] = current;
    setAnswer(questionId, { order: next });
  };

  return (
    <div className={'flex flex-col gap-2'}>
      {displayOrder.map((id, index) => (
        <div
          key={id}
          className={'flex items-center gap-2 rounded-md border px-3 py-2'}
        >
          <span className={'text-muted-foreground w-6 text-sm'}>{index + 1}.</span>
          <span className={'flex-1 text-sm'}>{byId[id] ?? id}</span>
          <Button
            type={'button'}
            variant={'ghost'}
            size={'icon'}
            disabled={index === 0}
            onClick={() => moveItem(index, -1)}
          >
            <ArrowUp className={'size-4'} />
          </Button>
          <Button
            type={'button'}
            variant={'ghost'}
            size={'icon'}
            disabled={index === displayOrder.length - 1}
            onClick={() => moveItem(index, 1)}
          >
            <ArrowDown className={'size-4'} />
          </Button>
        </div>
      ))}
    </div>
  );
}

function FileUploadAnswerInput({
  attemptId,
  questionId,
  questionType,
  current,
  setAnswer,
}: {
  attemptId: string;
  questionId: string;
  questionType: string;
  current: Record<string, unknown>;
  setAnswer: (questionId: string, answerData: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation('lms');
  const [uploading, setUploading] = useState(false);
  const fileName = current.fileName ? String(current.fileName) : null;
  const fileCategory = getUploadFileCategory(questionType);

  const acceptByCategory = {
    document: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    audio: '.mp3,.wav,.webm,.ogg,.m4a',
    spreadsheet: '.xls,.xlsx,.csv',
  } as const;

  const hintByCategory = {
    document: 'lms:attempt.fileUploadHint',
    audio: 'lms:attempt.audioUploadHint',
    spreadsheet: 'lms:attempt.spreadsheetUploadHint',
  } as const;

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.set('attemptId', attemptId);
      formData.set('questionId', questionId);
      formData.set('fileCategory', fileCategory);
      formData.set('file', file);

      const result = await uploadAttemptAnswerFile(formData);
      setAnswer(questionId, result);
      toast.success(t('toast.fileUploaded'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('toast.fileUploadFailed'),
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className={'flex flex-col gap-2'}>
      <Input
        type={'file'}
        accept={acceptByCategory[fileCategory]}
        disabled={uploading}
        onChange={onFileChange}
      />
      {uploading && (
        <p className={'text-muted-foreground flex items-center gap-2 text-sm'}>
          <Loader2 className={'size-4 animate-spin'} />
          <Trans i18nKey={'lms:attempt.uploadingFile'} />
        </p>
      )}
      {fileName && !uploading && (
        <p className={'text-sm text-green-600 dark:text-green-400'}>
          <Trans i18nKey={'lms:attempt.fileUploaded'} />: {fileName}
        </p>
      )}
      <p className={'text-muted-foreground text-xs'}>
        <Trans i18nKey={hintByCategory[fileCategory]} />
      </p>
    </div>
  );
}
