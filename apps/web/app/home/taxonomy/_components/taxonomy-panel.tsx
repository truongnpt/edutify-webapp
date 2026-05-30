'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import {
  CreateSubjectSchema,
  UpdateSubjectSchema,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from '~/lib/lms/subjects/schemas/subject.schema';
import {
  createSubjectAction,
  deleteSubjectAction,
  updateSubjectAction,
} from '~/lib/lms/subjects/server-actions';
import {
  CreateTagSchema,
  UpdateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from '~/lib/lms/tags/schemas/tag.schema';
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from '~/lib/lms/tags/server-actions';
import type { TopicRow } from '~/lib/lms/topics/topic-tree';

import { TopicsSection } from './topics-section';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface TagItem {
  id: string;
  name: string;
}

interface TaxonomyPanelProps {
  subjects: SubjectItem[];
  tags: TagItem[];
  topics: TopicRow[];
}

export function TaxonomyPanel({ subjects, tags, topics }: TaxonomyPanelProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectItem | null>(null);
  const [editTag, setEditTag] = useState<TagItem | null>(null);

  const subjectForm = useForm<CreateSubjectInput>({
    resolver: zodResolver(CreateSubjectSchema),
    defaultValues: { name: '', code: '', description: '' },
  });

  const tagForm = useForm<CreateTagInput>({
    resolver: zodResolver(CreateTagSchema),
    defaultValues: { name: '' },
  });

  const editSubjectForm = useForm<UpdateSubjectInput>({
    resolver: zodResolver(UpdateSubjectSchema),
  });

  const editTagForm = useForm<UpdateTagInput>({
    resolver: zodResolver(UpdateTagSchema),
  });

  const onCreateSubject = (data: CreateSubjectInput) => {
    startTransition(async () => {
      try {
        await createSubjectAction(data);
        toast.success(t('toast.subjectCreated'));
        subjectForm.reset();
        setSubjectOpen(false);
      } catch {
        toast.error(t('toast.subjectCreateFailed'));
      }
    });
  };

  const onUpdateSubject = (data: UpdateSubjectInput) => {
    startTransition(async () => {
      try {
        await updateSubjectAction(data);
        toast.success(t('toast.subjectUpdated'));
        setEditSubject(null);
      } catch {
        toast.error(t('toast.subjectUpdateFailed'));
      }
    });
  };

  const onCreateTag = (data: CreateTagInput) => {
    startTransition(async () => {
      try {
        await createTagAction(data);
        toast.success(t('toast.tagCreated'));
        tagForm.reset();
        setTagOpen(false);
      } catch {
        toast.error(t('toast.tagCreateFailed'));
      }
    });
  };

  const onUpdateTag = (data: UpdateTagInput) => {
    startTransition(async () => {
      try {
        await updateTagAction(data);
        toast.success(t('toast.tagUpdated'));
        setEditTag(null);
      } catch {
        toast.error(t('toast.tagUpdateFailed'));
      }
    });
  };

  return (
    <div className={'grid gap-6 lg:grid-cols-2'}>
      <Card>
        <CardHeader className={'flex flex-row items-center justify-between'}>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:taxonomy.subjectsTitle'} />
          </CardTitle>
          <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
            <DialogTrigger asChild>
              <Button size={'sm'}>
                <Plus className={'mr-1 size-4'} />
                <Trans i18nKey={'lms:taxonomy.addSubject'} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans i18nKey={'lms:taxonomy.addSubject'} />
                </DialogTitle>
              </DialogHeader>
              <Form {...subjectForm}>
                <form
                  onSubmit={subjectForm.handleSubmit(onCreateSubject)}
                  className={'flex flex-col gap-4'}
                >
                  <FormField
                    control={subjectForm.control}
                    name={'name'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:taxonomy.subjectName'} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subjectForm.control}
                    name={'code'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:taxonomy.subjectCode'} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={'MATH'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subjectForm.control}
                    name={'description'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:taxonomy.description'} />
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
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
        </CardHeader>
        <CardContent className={'flex flex-col gap-2'}>
          {subjects.length === 0 ?
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:taxonomy.emptySubjects'} />
            </p>
          : subjects.map((subject) => (
              <div
                key={subject.id}
                className={'flex items-center justify-between rounded-md border p-3'}
              >
                <div>
                  <p className={'font-medium'}>{subject.name}</p>
                  <Badge variant={'outline'}>{subject.code}</Badge>
                </div>
                <div className={'flex gap-1'}>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    onClick={() => {
                      editSubjectForm.reset({
                        id: subject.id,
                        name: subject.name,
                        code: subject.code,
                        description: subject.description ?? '',
                      });
                      setEditSubject(subject);
                    }}
                  >
                    <Pencil className={'size-4'} />
                  </Button>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    onClick={() => {
                      if (!confirm('Delete subject?')) return;

                      startTransition(async () => {
                        try {
                          await deleteSubjectAction({ id: subject.id });
                          toast.success(t('toast.subjectDeleted'));
                        } catch {
                          toast.error(t('toast.subjectDeleteFailed'));
                        }
                      });
                    }}
                  >
                    <Trash2 className={'size-4'} />
                  </Button>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={'flex flex-row items-center justify-between'}>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:taxonomy.tagsTitle'} />
          </CardTitle>
          <Dialog open={tagOpen} onOpenChange={setTagOpen}>
            <DialogTrigger asChild>
              <Button size={'sm'}>
                <Plus className={'mr-1 size-4'} />
                <Trans i18nKey={'lms:taxonomy.addTag'} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans i18nKey={'lms:taxonomy.addTag'} />
                </DialogTitle>
              </DialogHeader>
              <Form {...tagForm}>
                <form
                  onSubmit={tagForm.handleSubmit(onCreateTag)}
                  className={'flex flex-col gap-4'}
                >
                  <FormField
                    control={tagForm.control}
                    name={'name'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:taxonomy.tagName'} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
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
        </CardHeader>
        <CardContent className={'flex flex-wrap gap-2'}>
          {tags.length === 0 ?
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:taxonomy.emptyTags'} />
            </p>
          : tags.map((tag) => (
              <div key={tag.id} className={'flex items-center gap-1'}>
                <Badge variant={'secondary'}>{tag.name}</Badge>
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  className={'size-6'}
                  onClick={() => {
                    editTagForm.reset({ id: tag.id, name: tag.name });
                    setEditTag(tag);
                  }}
                >
                  <Pencil className={'size-3'} />
                </Button>
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  className={'size-6'}
                  onClick={() => {
                    if (!confirm('Delete tag?')) return;

                    startTransition(async () => {
                      try {
                        await deleteTagAction({ id: tag.id });
                        toast.success(t('toast.tagDeleted'));
                      } catch {
                        toast.error(t('toast.tagDeleteFailed'));
                      }
                    });
                  }}
                >
                  <Trash2 className={'size-3'} />
                </Button>
              </div>
            ))
          }
        </CardContent>
      </Card>

      <Dialog
        open={editSubject !== null}
        onOpenChange={(open) => {
          if (!open) setEditSubject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:taxonomy.editSubject'} />
            </DialogTitle>
          </DialogHeader>
          <Form {...editSubjectForm}>
            <form
              onSubmit={editSubjectForm.handleSubmit(onUpdateSubject)}
              className={'flex flex-col gap-4'}
            >
              <FormField
                control={editSubjectForm.control}
                name={'name'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:taxonomy.subjectName'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editSubjectForm.control}
                name={'code'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:taxonomy.subjectCode'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
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

      <Dialog
        open={editTag !== null}
        onOpenChange={(open) => {
          if (!open) setEditTag(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:taxonomy.editTag'} />
            </DialogTitle>
          </DialogHeader>
          <Form {...editTagForm}>
            <form
              onSubmit={editTagForm.handleSubmit(onUpdateTag)}
              className={'flex flex-col gap-4'}
            >
              <FormField
                control={editTagForm.control}
                name={'name'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:taxonomy.tagName'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
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

      <Card className={'lg:col-span-2'}>
        <CardHeader>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:taxonomy.topicsTitle'} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopicsSection
            subjects={subjects.map((s) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            }))}
            topics={topics}
          />
        </CardContent>
      </Card>
    </div>
  );
}
