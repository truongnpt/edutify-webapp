'use client';

import { useState, useTransition } from 'react';

import {
  Archive,
  Layers,
  Lock,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import {
  addSectionItemAction,
  createQuestionGroupAction,
  createSectionAction,
  deleteSectionAction,
  publishExamAction,
  removeSectionItemAction,
  reorderSectionItemsAction,
  reorderSectionsAction,
  startPreviewAttemptAction,
  updateExamAction,
  updateExamStatusAction,
  updateSectionAction,
} from '~/lib/lms/exams/server-actions';

import { SortableList } from './exam-builder-sortable';

interface ExamBuilderProps {
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    pass_score: number;
    total_score: number;
    status: string;
    max_attempts: number | null;
    subject_id: string | null;
  };
  subjects: Array<{ id: string; name: string; code: string }>;
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
    items: Array<{
      id: string;
      question_id: string | null;
      question_group_id: string | null;
      score: number;
      sort_order: number;
      question?: {
        id: string;
        title: string | null;
        content: string;
        question_type: string;
      } | null;
      question_group?: {
        id: string;
        title: string;
        group_type: string;
        shared_content: string | null;
      } | null;
    }>;
  }>;
  banks: Array<{ id: string; name: string }>;
  availableQuestions: Array<{
    id: string;
    title: string | null;
    content: string;
    question_type: string;
    bank_id: string;
    question_group_id: string | null;
  }>;
  questionGroups: Array<{
    id: string;
    title: string;
    group_type: string;
    bank_id: string;
    question_count: number;
  }>;
}

export function ExamBuilder({
  exam,
  sections,
  banks,
  availableQuestions,
  questionGroups,
  subjects,
}: ExamBuilderProps) {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description ?? '');
  const [duration, setDuration] = useState(exam.duration_minutes);
  const [passScore, setPassScore] = useState(Number(exam.pass_score));
  const [maxAttempts, setMaxAttempts] = useState<string>(
    exam.max_attempts != null ? String(exam.max_attempts) : '',
  );
  const [subjectId, setSubjectId] = useState<string>(
    exam.subject_id ?? 'none',
  );
  const [addQuestionSectionId, setAddQuestionSectionId] = useState<
    string | null
  >(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [addGroupSectionId, setAddGroupSectionId] = useState<string | null>(
    null,
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupBankId, setNewGroupBankId] = useState(banks[0]?.id ?? '');
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupContent, setNewGroupContent] = useState('');
  const [editSection, setEditSection] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);

  const isDraft = exam.status === 'draft';
  const isPublished = exam.status === 'published';

  const saveExamSettings = () => {
    startTransition(async () => {
      try {
        await updateExamAction({
          id: exam.id,
          title,
          description,
          durationMinutes: duration,
          passScore,
          totalScore: Number(exam.total_score),
          maxAttempts:
            maxAttempts.trim() === '' ? null : Number(maxAttempts),
          subjectId: subjectId === 'none' ? null : subjectId,
        });
        toast.success(t('toast.examSettingsSaved'));
      } catch {
        toast.error(t('toast.examSaveFailed'));
      }
    });
  };

  const saveSection = () => {
    if (!editSection) return;

    startTransition(async () => {
      try {
        await updateSectionAction({
          id: editSection.id,
          examId: exam.id,
          title: editSection.title,
          description: editSection.description,
        });
        setEditSection(null);
        toast.success(t('toast.sectionUpdated'));
      } catch {
        toast.error(t('toast.sectionUpdateFailed'));
      }
    });
  };

  const deleteSection = (sectionId: string) => {
    if (!window.confirm('Delete this section and all its items?')) return;

    startTransition(async () => {
      try {
        await deleteSectionAction({ id: sectionId, examId: exam.id });
        toast.success(t('toast.sectionDeleted'));
        router.refresh();
      } catch {
        toast.error(t('toast.sectionDeleteFailed'));
      }
    });
  };

  const handleSectionReorder = (sectionIds: string[]) => {
    startTransition(async () => {
      try {
        await reorderSectionsAction({ examId: exam.id, sectionIds });
        router.refresh();
      } catch {
        toast.error(t('toast.sectionsReorderFailed'));
      }
    });
  };

  const handleItemReorder = (sectionId: string, itemIds: string[]) => {
    startTransition(async () => {
      try {
        await reorderSectionItemsAction({
          examId: exam.id,
          sectionId,
          itemIds,
        });
        router.refresh();
      } catch {
        toast.error(t('toast.itemsReorderFailed'));
      }
    });
  };

  const changeExamStatus = (
    status: 'draft' | 'published' | 'archived' | 'closed',
  ) => {
    startTransition(async () => {
      try {
        await updateExamStatusAction({ id: exam.id, status });
        toast.success(t('toast.examStatusUpdated'));
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.examStatusFailed'),
        );
      }
    });
  };

  const addSection = () => {
    startTransition(async () => {
      try {
        await createSectionAction({
          examId: exam.id,
          title: `Part ${sections.length + 1}`,
        });
        toast.success(t('toast.sectionAdded'));
      } catch {
        toast.error(t('toast.sectionAddFailed'));
      }
    });
  };

  const addQuestion = (sectionId: string) => {
    if (!selectedQuestionId) return;

    startTransition(async () => {
      try {
        await addSectionItemAction({
          sectionId,
          examId: exam.id,
          questionId: selectedQuestionId,
          score: 1,
        });
        setAddQuestionSectionId(null);
        setSelectedQuestionId('');
        toast.success(t('toast.questionAdded'));
      } catch {
        toast.error(t('toast.questionAddFailed'));
      }
    });
  };

  const addGroup = (sectionId: string) => {
    if (!selectedGroupId) return;

    startTransition(async () => {
      try {
        await addSectionItemAction({
          sectionId,
          examId: exam.id,
          questionGroupId: selectedGroupId,
          score: 1,
        });
        setAddGroupSectionId(null);
        setSelectedGroupId('');
        toast.success(t('toast.questionGroupAdded'));
      } catch {
        toast.error(t('toast.questionGroupAddFailed'));
      }
    });
  };

  const createGroup = () => {
    if (!newGroupBankId || !newGroupTitle) return;

    startTransition(async () => {
      try {
        await createQuestionGroupAction({
          bankId: newGroupBankId,
          title: newGroupTitle,
          groupType: 'passage',
          sharedContent: newGroupContent,
        });
        setNewGroupOpen(false);
        setNewGroupTitle('');
        setNewGroupContent('');
        toast.success(t('toast.questionGroupCreatedRefresh'));
      } catch {
        toast.error(t('toast.questionGroupCreateFailed'));
      }
    });
  };

  const removeItem = (itemId: string) => {
    startTransition(async () => {
      try {
        await removeSectionItemAction({ id: itemId, examId: exam.id });
        toast.success(t('toast.itemRemoved'));
      } catch {
        toast.error(t('toast.itemRemoveFailed'));
      }
    });
  };

  const publish = () => {
    startTransition(async () => {
      try {
        await publishExamAction({ id: exam.id });
        toast.success(t('toast.examPublished'));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.examPublishFailed'),
        );
      }
    });
  };

  const preview = () => {
    startTransition(async () => {
      try {
        await startPreviewAttemptAction({ examId: exam.id });
      } catch {
        toast.error(t('toast.previewFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-6'}>
      <div className={'flex flex-wrap items-center gap-2'}>
        <Button variant={'ghost'} size={'sm'} asChild>
          <Link href={pathsConfig.app.exams}>
            <Trans i18nKey={'lms:common.back'} />
          </Link>
        </Button>
        <Badge variant={'outline'}>{exam.status}</Badge>
        <div className={'ml-auto flex flex-wrap gap-2'}>
          {isPublished && (
            <>
              <Button
                variant={'outline'}
                onClick={() => changeExamStatus('closed')}
                disabled={pending}
              >
                <Lock className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:exams.close'} />
              </Button>
              <Button
                variant={'outline'}
                onClick={() => changeExamStatus('archived')}
                disabled={pending}
              >
                <Archive className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:exams.archive'} />
              </Button>
            </>
          )}
          {exam.status === 'closed' && (
            <Button
              variant={'outline'}
              onClick={() => changeExamStatus('published')}
              disabled={pending}
            >
              <RotateCcw className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:exams.reopen'} />
            </Button>
          )}
          {exam.status === 'archived' && (
            <>
              <Button
                variant={'outline'}
                onClick={() => changeExamStatus('published')}
                disabled={pending}
              >
                <RotateCcw className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:exams.restorePublished'} />
              </Button>
              <Button
                variant={'outline'}
                onClick={() => changeExamStatus('draft')}
                disabled={pending}
              >
                <Pencil className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:exams.restoreDraft'} />
              </Button>
            </>
          )}
          <Button variant={'outline'} onClick={preview} disabled={pending}>
            <Play className={'mr-2 size-4'} />
            <Trans i18nKey={'lms:exams.preview'} />
          </Button>
          {isDraft && (
            <Button onClick={publish} disabled={pending}>
              <Send className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:exams.publish'} />
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey={'lms:exams.settingsTitle'} />
          </CardTitle>
        </CardHeader>
        <CardContent className={'flex flex-col gap-4'}>
          <div className={'grid gap-4 md:grid-cols-2'}>
            <div className={'flex flex-col gap-2'}>
              <Label>
                <Trans i18nKey={'lms:exams.titleLabel'} />
              </Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={'flex flex-col gap-2'}>
              <Label>
                <Trans i18nKey={'lms:exams.durationLabel'} />
              </Label>
              <Input
                type={'number'}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className={'flex flex-col gap-2'}>
            <Label>
              <Trans i18nKey={'lms:exams.descriptionLabel'} />
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className={'grid gap-4 md:grid-cols-2'}>
            <div className={'flex flex-col gap-2'}>
              <Label>
                <Trans i18nKey={'lms:exams.subjectLabel'} />
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={'Select subject'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'none'}>
                    <Trans i18nKey={'lms:exams.noSubject'} />
                  </SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={'flex flex-col gap-2'}>
              <Label>
                <Trans i18nKey={'lms:exams.passScoreLabel'} />
              </Label>
              <Input
                type={'number'}
                value={passScore}
                onChange={(e) => setPassScore(Number(e.target.value))}
              />
            </div>
          </div>
          <div className={'flex flex-col gap-2 md:w-48'}>
            <Label>
              <Trans i18nKey={'lms:exams.maxAttemptsLabel'} />
            </Label>
            <Input
              type={'number'}
              min={1}
              placeholder={'Unlimited'}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
            />
          </div>
          <Button onClick={saveExamSettings} disabled={pending}>
            <Trans i18nKey={'lms:common.save'} />
          </Button>
        </CardContent>
      </Card>

      <div className={'flex items-center justify-between'}>
        <h2 className={'text-lg font-semibold'}>
          <Trans i18nKey={'lms:exams.sectionsTitle'} />
        </h2>
        <div className={'flex gap-2'}>
          <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
            <DialogTrigger asChild>
              <Button variant={'outline'} size={'sm'}>
                <Layers className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:exams.createGroup'} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans i18nKey={'lms:exams.createGroup'} />
                </DialogTitle>
              </DialogHeader>
              <div className={'flex flex-col gap-4'}>
                <div className={'flex flex-col gap-2'}>
                  <Label>Bank</Label>
                  <Select value={newGroupBankId} onValueChange={setNewGroupBankId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={'flex flex-col gap-2'}>
                  <Label>Title</Label>
                  <Input
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                  />
                </div>
                <div className={'flex flex-col gap-2'}>
                  <Label>Shared content (passage / case study)</Label>
                  <Textarea
                    value={newGroupContent}
                    onChange={(e) => setNewGroupContent(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button onClick={createGroup} disabled={pending}>
                  <Trans i18nKey={'lms:common.create'} />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size={'sm'} onClick={addSection} disabled={pending || !isDraft}>
            <Plus className={'mr-2 size-4'} />
            <Trans i18nKey={'lms:exams.addSection'} />
          </Button>
        </div>
      </div>

      <SortableList
        items={sections}
        disabled={!isDraft || pending}
        onReorder={handleSectionReorder}
      >
        {(section, sectionDragHandle) => (
        <Card>
          <CardHeader className={'flex flex-row items-start justify-between gap-4'}>
            <div className={'flex items-start gap-2'}>
              {isDraft && sectionDragHandle}
              <div className={'flex flex-col gap-1'}>
                <CardTitle className={'text-base'}>{section.title}</CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </div>
            </div>
            {isDraft && (
              <div className={'flex shrink-0 gap-1'}>
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  onClick={() =>
                    setEditSection({
                      id: section.id,
                      title: section.title,
                      description: section.description ?? '',
                    })
                  }
                  disabled={pending}
                >
                  <Pencil className={'size-4'} />
                </Button>
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  onClick={() => deleteSection(section.id)}
                  disabled={pending}
                >
                  <Trash2 className={'size-4'} />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className={'flex flex-col gap-4'}>
            {section.items.length === 0 ? (
              <p className={'text-muted-foreground text-sm'}>
                <Trans i18nKey={'lms:exams.emptySection'} />
              </p>
            ) : (
              <SortableList
                items={section.items}
                disabled={!isDraft || pending}
                className={'gap-2'}
                onReorder={(itemIds) =>
                  handleItemReorder(section.id, itemIds)
                }
              >
                {(item, itemDragHandle) => {
                  const idx = section.items.findIndex((i) => i.id === item.id);

                  return (
                  <div
                    className={
                      'flex items-start justify-between gap-4 rounded-md border p-3'
                    }
                  >
                    <div className={'flex items-start gap-2'}>
                      {isDraft && itemDragHandle}
                      <div className={'flex flex-col gap-1'}>
                        <span className={'text-muted-foreground text-xs'}>
                          #{idx + 1} · score {item.score}
                        </span>
                        {item.question && (
                          <>
                            <Badge variant={'outline'} className={'w-fit'}>
                              {item.question.question_type}
                            </Badge>
                            <p className={'text-sm'}>
                              {item.question.title ?? item.question.content}
                            </p>
                          </>
                        )}
                        {item.question_group && (
                          <>
                            <Badge variant={'secondary'} className={'w-fit'}>
                              Group: {item.question_group.group_type}
                            </Badge>
                            <p className={'font-medium text-sm'}>
                              {item.question_group.title}
                            </p>
                            {item.question_group.shared_content && (
                              <p className={'text-muted-foreground line-clamp-2 text-xs'}>
                                {item.question_group.shared_content}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isDraft && (
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => removeItem(item.id)}
                        disabled={pending}
                      >
                        <Trash2 className={'size-4'} />
                      </Button>
                    )}
                  </div>
                  );
                }}
              </SortableList>
            )}

            <Separator />

            <div className={'flex flex-wrap gap-2'}>
              {isDraft && (
              <>
              <Dialog
                open={addQuestionSectionId === section.id}
                onOpenChange={(o) =>
                  setAddQuestionSectionId(o ? section.id : null)
                }
              >
                <DialogTrigger asChild>
                  <Button variant={'outline'} size={'sm'}>
                    <Plus className={'mr-2 size-4'} />
                    <Trans i18nKey={'lms:exams.addQuestion'} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      <Trans i18nKey={'lms:exams.addQuestion'} />
                    </DialogTitle>
                  </DialogHeader>
                  <Select
                    value={selectedQuestionId}
                    onValueChange={setSelectedQuestionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={'Select question'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuestions
                        .filter((q) => !q.question_group_id)
                        .map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            [{q.question_type}]{' '}
                            {(q.title ?? q.content).slice(0, 60)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addQuestion(section.id)}
                    disabled={pending || !selectedQuestionId}
                  >
                    <Trans i18nKey={'lms:common.create'} />
                  </Button>
                </DialogContent>
              </Dialog>

              <Dialog
                open={addGroupSectionId === section.id}
                onOpenChange={(o) =>
                  setAddGroupSectionId(o ? section.id : null)
                }
              >
                <DialogTrigger asChild>
                  <Button variant={'outline'} size={'sm'}>
                    <Layers className={'mr-2 size-4'} />
                    <Trans i18nKey={'lms:exams.addGroup'} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      <Trans i18nKey={'lms:exams.addGroup'} />
                    </DialogTitle>
                  </DialogHeader>
                  <Select
                    value={selectedGroupId}
                    onValueChange={setSelectedGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={'Select question group'} />
                    </SelectTrigger>
                    <SelectContent>
                      {questionGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          [{g.group_type}] {g.title} ({g.question_count} Q)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addGroup(section.id)}
                    disabled={pending || !selectedGroupId}
                  >
                    <Trans i18nKey={'lms:common.create'} />
                  </Button>
                </DialogContent>
              </Dialog>
              </>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </SortableList>

      <Dialog
        open={editSection != null}
        onOpenChange={(open) => {
          if (!open) setEditSection(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:exams.editSection'} />
            </DialogTitle>
          </DialogHeader>
          {editSection && (
            <div className={'flex flex-col gap-4'}>
              <div className={'flex flex-col gap-2'}>
                <Label>
                  <Trans i18nKey={'lms:exams.sectionTitleLabel'} />
                </Label>
                <Input
                  value={editSection.title}
                  onChange={(e) =>
                    setEditSection({ ...editSection, title: e.target.value })
                  }
                />
              </div>
              <div className={'flex flex-col gap-2'}>
                <Label>
                  <Trans i18nKey={'lms:exams.descriptionLabel'} />
                </Label>
                <Textarea
                  value={editSection.description}
                  onChange={(e) =>
                    setEditSection({
                      ...editSection,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <Button
                onClick={saveSection}
                disabled={pending || !editSection.title.trim()}
              >
                <Trans i18nKey={'lms:common.save'} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
