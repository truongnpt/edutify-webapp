'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
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
  CreateExamSchema,
  type CreateExamInput,
} from '~/lib/lms/exams/schemas/exam.schema';
import {
  createExamAction,
  deleteExamAction,
} from '~/lib/lms/exams/server-actions';
import type { OrganizationContext } from '~/lib/lms/types';

interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  pass_score: number;
  status: string;
  section_count: number;
  created_at: string;
  subject?: { id: string; name: string; code: string } | null;
}

interface ExamsListProps {
  context: OrganizationContext;
  exams: ExamListItem[];
}

export function ExamsList({ context, exams }: ExamsListProps) {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateExamInput>({
    resolver: zodResolver(CreateExamSchema),
    defaultValues: {
      title: '',
      description: '',
      durationMinutes: 60,
      passScore: 50,
      totalScore: 100,
    },
  });

  const onCreate = (data: CreateExamInput) => {
    startTransition(async () => {
      try {
        const result = await createExamAction(data);

        if (result?.id) {
          setOpen(false);
          form.reset();
          router.push(`${pathsConfig.app.exams}/${result.id}`);
        }
      } catch {
        toast.error(t('toast.examCreateFailed'));
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('Delete this exam?')) return;

    startTransition(async () => {
      try {
        await deleteExamAction({ id });
        toast.success(t('toast.examDeleted'));
        router.refresh();
      } catch {
        toast.error(t('toast.examDeleteFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center justify-between'}>
        <p className={'text-muted-foreground text-sm'}>
          {context.plan?.max_exams ?? 5}{' '}
          <Trans i18nKey={'lms:exams.quotaHint'} />
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:exams.create'} />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey={'lms:exams.create'} />
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onCreate)}
                className={'flex flex-col gap-4'}
              >
                <FormField
                  control={form.control}
                  name={'title'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:exams.titleLabel'} />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={'description'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:exams.descriptionLabel'} />
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className={'grid grid-cols-2 gap-4'}>
                  <FormField
                    control={form.control}
                    name={'durationMinutes'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:exams.durationLabel'} />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type={'number'}
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
                    name={'passScore'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:exams.passScoreLabel'} />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type={'number'}
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
                </div>

                <Button type={'submit'} disabled={pending}>
                  <Trans i18nKey={'lms:common.create'} />
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className={'flex flex-col items-center gap-4 py-12'}>
            <ClipboardList className={'text-muted-foreground size-12'} />
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:exams.empty'} />
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader className={'flex flex-row items-start justify-between'}>
                <div className={'flex flex-col gap-2'}>
                  <CardTitle className={'text-base'}>
                    <Link
                      href={`${pathsConfig.app.exams}/${exam.id}`}
                      className={'hover:underline'}
                    >
                      {exam.title}
                    </Link>
                  </CardTitle>
                  <Badge variant={'outline'}>{exam.status}</Badge>
                  {exam.subject && typeof exam.subject === 'object' && (
                    <Badge variant={'secondary'}>{exam.subject.name}</Badge>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} size={'icon'}>
                      <MoreHorizontal className={'size-4'} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={'end'}>
                    <DropdownMenuItem
                      className={'text-destructive'}
                      onClick={() => onDelete(exam.id)}
                    >
                      <Trash2 className={'mr-2 size-4'} />
                      <Trans i18nKey={'lms:common.delete'} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className={'flex flex-col gap-1'}>
                <CardDescription>
                  {exam.duration_minutes} min · {exam.section_count}{' '}
                  <Trans i18nKey={'lms:exams.sections'} />
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
