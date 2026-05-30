'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';

import type { Question, QuestionBank } from '~/lib/lms/types';

import { QuestionGroupsPanel } from './question-groups-panel';
import { QuestionsPanel } from './questions-panel';

interface QuestionGroupItem {
  id: string;
  title: string;
  group_type: string;
  shared_content: string | null;
  resource_url: string | null;
  question_count: number;
}

interface GroupedQuestion {
  id: string;
  content: string;
  question_type: string;
  question_group_id: string | null;
  status: string;
}

interface QuestionBankTabsProps {
  bank: QuestionBank;
  questions: Question[];
  availableTags: Array<{ id: string; name: string }>;
  groups: QuestionGroupItem[];
  groupedQuestions: GroupedQuestion[];
}

export function QuestionBankTabs({
  bank,
  questions,
  availableTags,
  groups,
  groupedQuestions,
}: QuestionBankTabsProps) {
  const [tab, setTab] = useState<'questions' | 'groups'>('questions');

  const ungroupedQuestions = questions
    .filter((q) => !q.question_group_id)
    .map((q) => ({
      id: q.id,
      content: q.content,
      question_type: q.question_type ?? q.type ?? '',
    }));

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex gap-2'}>
        <Button
          variant={tab === 'questions' ? 'default' : 'outline'}
          size={'sm'}
          onClick={() => setTab('questions')}
        >
          <Trans i18nKey={'lms:questions.tabQuestions'} />
        </Button>
        <Button
          variant={tab === 'groups' ? 'default' : 'outline'}
          size={'sm'}
          onClick={() => setTab('groups')}
        >
          <Trans i18nKey={'lms:questionGroups.tabTitle'} />
        </Button>
      </div>

      {tab === 'questions' ?
        <QuestionsPanel
          bank={bank}
          questions={questions}
          availableTags={availableTags}
          availableGroups={groups.map((g) => ({ id: g.id, title: g.title }))}
        />
      : <QuestionGroupsPanel
          bankId={bank.id}
          groups={groups}
          groupedQuestions={groupedQuestions}
          ungroupedQuestions={ungroupedQuestions}
        />
      }
    </div>
  );
}
