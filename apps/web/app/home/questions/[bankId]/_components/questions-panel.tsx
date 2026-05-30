'use client';

import { useState, useTransition } from 'react';

import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
import {
  QUESTION_TYPE_LABELS,
  isMatchingOrLabelingType,
  questionToFormValues,
} from '~/lib/lms/questions/question-form-utils';
import { deleteQuestionAction, updateQuestionStatusAction } from '~/lib/lms/questions/server-actions';
import type { Question, QuestionBank } from '~/lib/lms/types';

import { QuestionFormDialog } from './question-form-dialog';

interface QuestionsPanelProps {
  bank: QuestionBank;
  questions: Question[];
  availableTags: Array<{ id: string; name: string }>;
  availableGroups?: Array<{ id: string; title: string }>;
}

function renderQuestionPreview(question: Question) {
  const type = question.question_type ?? question.type ?? '';
  const schema = (question.answer_schema ?? {}) as Record<string, unknown>;

  if (isMatchingOrLabelingType(type)) {
    const leftItems = (schema.leftItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const rightItems = (schema.rightItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const answers = (schema.answers ?? {}) as Record<string, string>;
    const rightById = Object.fromEntries(
      rightItems.map((item) => [item.id, item.content]),
    );

    return (
      <ul className={'flex flex-col gap-1 text-sm'}>
        {leftItems.map((left) => (
          <li key={left.id} className={'text-muted-foreground'}>
            {left.content} → {rightById[answers[left.id] ?? ''] ?? '—'}
          </li>
        ))}
      </ul>
    );
  }

  if (type === 'sequence_order' || type === 'drag_drop_order') {
    const items = (schema.items ?? []) as Array<{ id: string; content: string }>;
    const correctOrder = (schema.correctOrder ?? []) as string[];
    const byId = Object.fromEntries(items.map((item) => [item.id, item.content]));

    return (
      <ol className={'flex flex-col gap-1 text-sm'}>
        {correctOrder.map((id, index) => (
          <li key={id} className={'text-muted-foreground'}>
            {index + 1}. {byId[id] ?? id}
          </li>
        ))}
      </ol>
    );
  }

  if (type === 'fill_blank' || type === 'short_answer') {
    const accepted = (schema.acceptedAnswers ?? []) as string[];

    if (accepted.length > 0) {
      return (
        <ul className={'flex flex-col gap-1 text-sm'}>
          {accepted.map((answer, index) => (
            <li key={index} className={'text-muted-foreground'}>
              ✓ {answer}
            </li>
          ))}
        </ul>
      );
    }
  }

  if (question.options && question.options.length > 0) {
    return (
      <ul className={'flex flex-col gap-1 text-sm'}>
        {question.options.map((option) => (
          <li
            key={option.id}
            className={
              option.is_correct
                ? 'font-medium text-green-600 dark:text-green-400'
              : 'text-muted-foreground'
            }
          >
            {option.is_correct ? '✓ ' : '○ '}
            {option.content}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

export function QuestionsPanel({
  bank,
  questions,
  availableTags,
  availableGroups = [],
}: QuestionsPanelProps) {
  const { t } = useTranslation('lms');
  const [createOpen, setCreateOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = (id: string) => {
    if (!confirm('Delete this question?')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteQuestionAction({ id });
        toast.success(t('toast.questionDeleted'));
      } catch {
        toast.error(t('toast.questionDeleteFailed'));
      }
    });
  };

  const onStatusChange = (
    id: string,
    status: 'draft' | 'published' | 'archived',
  ) => {
    startTransition(async () => {
      try {
        await updateQuestionStatusAction({ id, status });
        toast.success(t('toast.questionStatusUpdated'));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.questionStatusFailed'),
        );
      }
    });
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center gap-4'}>
        <Button variant={'ghost'} size={'sm'} asChild>
          <Link href={pathsConfig.app.questions}>
            <ArrowLeft className={'mr-2 size-4'} />
            <Trans i18nKey={'lms:common.back'} />
          </Link>
        </Button>

        <div className={'flex-1'}>
          <h2 className={'text-lg font-semibold'}>{bank.name}</h2>
          {bank.description && (
            <p className={'text-muted-foreground text-sm'}>{bank.description}</p>
          )}
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className={'mr-2 size-4'} />
          <Trans i18nKey={'lms:questions.createQuestion'} />
        </Button>
      </div>

      <QuestionFormDialog
        bankId={bank.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode={'create'}
        availableTags={availableTags}
        availableGroups={availableGroups}
      />

      <QuestionFormDialog
        bankId={bank.id}
        open={editQuestion !== null}
        onOpenChange={(open) => {
          if (!open) setEditQuestion(null);
        }}
        mode={'edit'}
        availableTags={availableTags}
        availableGroups={availableGroups}
        initialValues={
          editQuestion ? questionToFormValues(editQuestion, bank.id) : undefined
        }
      />

      {questions.length === 0 ? (
        <Card>
          <CardContent className={'py-12 text-center'}>
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:questions.emptyQuestions'} />
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={'flex flex-col gap-3'}>
          {questions.map((question, index) => {
            const type = question.question_type ?? question.type ?? '';
            const preview = renderQuestionPreview(question);

            return (
              <Card key={question.id}>
                <CardHeader
                  className={'flex flex-row items-start justify-between gap-4 pb-2'}
                >
                  <div className={'flex flex-col gap-2'}>
                    <div className={'flex items-center gap-2'}>
                      <span className={'text-muted-foreground text-sm'}>
                        #{questions.length - index}
                      </span>
                      <Badge variant={'outline'}>
                        {QUESTION_TYPE_LABELS[type] ?? type}
                      </Badge>
                      <Badge
                        variant={
                          question.status === 'published' ? 'default'
                          : question.status === 'archived' ? 'secondary'
                          : 'outline'
                        }
                      >
                        {question.status}
                      </Badge>
                      <Badge variant={'secondary'}>{question.difficulty}</Badge>
                    </div>
                    <CardTitle className={'text-base font-normal'}>
                      {question.content}
                    </CardTitle>
                  </div>

                  <div className={'flex flex-col items-end gap-1'}>
                    <div className={'flex items-center gap-1'}>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => setEditQuestion(question)}
                        disabled={pending}
                      >
                        <Pencil className={'size-4'} />
                      </Button>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => onDelete(question.id)}
                        disabled={pending}
                      >
                        <Trash2 className={'size-4'} />
                      </Button>
                    </div>
                    <div className={'flex flex-wrap justify-end gap-1'}>
                      {question.status === 'draft' && (
                        <Button
                          variant={'outline'}
                          size={'sm'}
                          onClick={() => onStatusChange(question.id, 'published')}
                          disabled={pending}
                        >
                          <Trans i18nKey={'lms:questions.publish'} />
                        </Button>
                      )}
                      {question.status === 'published' && (
                        <Button
                          variant={'outline'}
                          size={'sm'}
                          onClick={() => onStatusChange(question.id, 'archived')}
                          disabled={pending}
                        >
                          <Trans i18nKey={'lms:questions.archive'} />
                        </Button>
                      )}
                      {question.status === 'archived' && (
                        <Button
                          variant={'outline'}
                          size={'sm'}
                          onClick={() => onStatusChange(question.id, 'draft')}
                          disabled={pending}
                        >
                          <Trans i18nKey={'lms:questions.restoreDraft'} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {preview && <CardContent>{preview}</CardContent>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
