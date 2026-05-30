'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import {
  CreateQuestionGroupSchema,
  UpdateQuestionGroupSchema,
  type CreateQuestionGroupInput,
  type UpdateQuestionGroupInput,
} from '~/lib/lms/question-groups/schemas/group.schema';
import {
  assignQuestionToGroupAction,
  createQuestionGroupAction,
  deleteQuestionGroupAction,
  updateQuestionGroupAction,
} from '~/lib/lms/question-groups/server-actions';

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

interface QuestionGroupsPanelProps {
  bankId: string;
  groups: QuestionGroupItem[];
  groupedQuestions: GroupedQuestion[];
  ungroupedQuestions: Array<{ id: string; content: string; question_type: string }>;
}

const GROUP_TYPES = [
  'passage',
  'audio',
  'image',
  'video',
  'case_study',
  'document',
  'none',
] as const;

export function QuestionGroupsPanel({
  bankId,
  groups,
  groupedQuestions,
  ungroupedQuestions,
}: QuestionGroupsPanelProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<QuestionGroupItem | null>(null);

  const createForm = useForm<CreateQuestionGroupInput>({
    resolver: zodResolver(CreateQuestionGroupSchema),
    defaultValues: {
      bankId,
      title: '',
      groupType: 'passage',
      sharedContent: '',
    },
  });

  const editForm = useForm<UpdateQuestionGroupInput>({
    resolver: zodResolver(UpdateQuestionGroupSchema),
  });

  const onCreate = (data: CreateQuestionGroupInput) => {
    startTransition(async () => {
      try {
        await createQuestionGroupAction(data);
        toast.success(t('toast.questionGroupCreated'));
        createForm.reset({ bankId, title: '', groupType: 'passage', sharedContent: '' });
        setCreateOpen(false);
      } catch {
        toast.error(t('toast.questionGroupCreateFailed'));
      }
    });
  };

  const onUpdate = (data: UpdateQuestionGroupInput) => {
    startTransition(async () => {
      try {
        await updateQuestionGroupAction(data);
        toast.success(t('toast.questionGroupUpdated'));
        setEditGroup(null);
      } catch {
        toast.error(t('toast.questionGroupUpdateFailed'));
      }
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this question group?')) return;

    startTransition(async () => {
      try {
        await deleteQuestionGroupAction({ id, bankId });
        toast.success(t('toast.questionGroupDeleted'));
      } catch {
        toast.error(t('toast.questionGroupDeleteFailed'));
      }
    });
  };

  const assignQuestion = (questionId: string, groupId: string | null) => {
    startTransition(async () => {
      try {
        await assignQuestionToGroupAction({ questionId, bankId, groupId });
        toast.success(t('toast.questionAssigned'));
      } catch {
        toast.error(t('toast.questionAssignFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center justify-between'}>
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'lms:questionGroups.description'} />
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:questionGroups.create'} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey={'lms:questionGroups.create'} />
              </DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(onCreate)}
                className={'flex flex-col gap-4'}
              >
                <FormField
                  control={createForm.control}
                  name={'title'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:questionGroups.titleLabel'} />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name={'groupType'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:questionGroups.typeLabel'} />
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GROUP_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name={'sharedContent'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:questionGroups.sharedContentLabel'} />
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type={'submit'} disabled={pending}>
                  <Trans i18nKey={'lms:common.create'} />
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ?
        <Card>
          <CardContent className={'py-10 text-center'}>
            <Layers className={'text-muted-foreground mx-auto mb-2 size-10'} />
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:questionGroups.empty'} />
            </p>
          </CardContent>
        </Card>
      : groups.map((group) => {
          const questionsInGroup = groupedQuestions.filter(
            (q) => q.question_group_id === group.id,
          );

          return (
            <Card key={group.id}>
              <CardHeader className={'flex flex-row items-start justify-between'}>
                <div className={'flex flex-col gap-2'}>
                  <CardTitle className={'text-base'}>{group.title}</CardTitle>
                  <div className={'flex gap-2'}>
                    <Badge variant={'outline'}>{group.group_type}</Badge>
                    <Badge variant={'secondary'}>
                      {group.question_count}{' '}
                      <Trans i18nKey={'lms:questionGroups.questionsCount'} />
                    </Badge>
                  </div>
                  {group.shared_content && (
                    <p className={'text-muted-foreground line-clamp-2 text-sm'}>
                      {group.shared_content}
                    </p>
                  )}
                </div>
                <div className={'flex gap-1'}>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    onClick={() => {
                      editForm.reset({
                        id: group.id,
                        bankId,
                        title: group.title,
                        groupType: group.group_type as UpdateQuestionGroupInput['groupType'],
                        sharedContent: group.shared_content ?? '',
                        resourceUrl: group.resource_url ?? '',
                      });
                      setEditGroup(group);
                    }}
                  >
                    <Pencil className={'size-4'} />
                  </Button>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    onClick={() => onDelete(group.id)}
                  >
                    <Trash2 className={'size-4'} />
                  </Button>
                </div>
              </CardHeader>
              {questionsInGroup.length > 0 && (
                <CardContent>
                  <ul className={'flex flex-col gap-1 text-sm'}>
                    {questionsInGroup.map((q) => (
                      <li key={q.id} className={'text-muted-foreground'}>
                        [{q.question_type}] {q.content.slice(0, 80)}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })
      }

      {ungroupedQuestions.length > 0 && groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={'text-base'}>
              <Trans i18nKey={'lms:questionGroups.assignQuestions'} />
            </CardTitle>
          </CardHeader>
          <CardContent className={'flex flex-col gap-3'}>
            {ungroupedQuestions.map((question) => (
              <div
                key={question.id}
                className={'flex flex-wrap items-center justify-between gap-2'}
              >
                <span className={'text-sm'}>
                  [{question.question_type}] {question.content.slice(0, 60)}
                </span>
                <Select
                  onValueChange={(value) =>
                    assignQuestion(
                      question.id,
                      value === 'none' ? null : value,
                    )
                  }
                >
                  <SelectTrigger className={'w-48'}>
                    <SelectValue placeholder={'Assign to group'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'none'}>
                      <Trans i18nKey={'lms:questionGroups.noGroup'} />
                    </SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={editGroup != null}
        onOpenChange={(open) => {
          if (!open) setEditGroup(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:questionGroups.edit'} />
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdate)}
              className={'flex flex-col gap-4'}
            >
              <FormField
                control={editForm.control}
                name={'title'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:questionGroups.titleLabel'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name={'sharedContent'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:questionGroups.sharedContentLabel'} />
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type={'submit'} disabled={pending}>
                <Trans i18nKey={'lms:common.save'} />
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
