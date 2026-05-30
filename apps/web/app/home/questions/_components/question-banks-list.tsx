'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
import type { OrganizationContext, QuestionBank } from '~/lib/lms/types';
import {
  CreateQuestionBankSchema,
  type CreateQuestionBankInput,
} from '~/lib/lms/questions/schemas/question-bank.schema';
import {
  createQuestionBankAction,
  deleteQuestionBankAction,
} from '~/lib/lms/questions/server-actions';

interface QuestionBanksListProps {
  context: OrganizationContext;
  banks: QuestionBank[];
}

export function QuestionBanksList({ context, banks }: QuestionBanksListProps) {
  const { t } = useTranslation('lms');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateQuestionBankInput>({
    resolver: zodResolver(CreateQuestionBankSchema),
    defaultValues: { name: '', description: '' },
  });

  const onCreate = (data: CreateQuestionBankInput) => {
    startTransition(async () => {
      try {
        await createQuestionBankAction(data);
        toast.success(t('toast.bankCreated'));
        form.reset();
        setOpen(false);
      } catch {
        toast.error(t('toast.bankCreateFailed'));
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('Delete this question bank and all its questions?')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteQuestionBankAction({ id });
        toast.success(t('toast.bankDeleted'));
      } catch {
        toast.error(t('toast.bankDeleteFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center justify-between'}>
        <p className={'text-muted-foreground text-sm'}>
          {context.plan?.max_questions ?? 100}{' '}
          <Trans i18nKey={'lms:questions.quotaHint'} />
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:questions.createBank'} />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey={'lms:questions.createBank'} />
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onCreate)}
                className={'flex flex-col gap-4'}
              >
                <FormField
                  control={form.control}
                  name={'name'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:questions.bankName'} />
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
                        <Trans i18nKey={'lms:questions.bankDescription'} />
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
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
      </div>

      {banks.length === 0 ? (
        <Card>
          <CardContent className={'flex flex-col items-center gap-4 py-12'}>
            <BookOpen className={'text-muted-foreground size-12'} />
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:questions.emptyBanks'} />
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
          {banks.map((bank) => (
            <Card key={bank.id}>
              <CardHeader className={'flex flex-row items-start justify-between'}>
                <div>
                  <CardTitle className={'text-base'}>
                    <Link
                      href={`${pathsConfig.app.questions}/${bank.id}`}
                      className={'hover:underline'}
                    >
                      {bank.name}
                    </Link>
                  </CardTitle>
                  {bank.description && (
                    <CardDescription className={'mt-1 line-clamp-2'}>
                      {bank.description}
                    </CardDescription>
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
                      onClick={() => onDelete(bank.id)}
                    >
                      <Trash2 className={'mr-2 size-4'} />
                      <Trans i18nKey={'lms:common.delete'} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                <p className={'text-muted-foreground text-sm'}>
                  {bank.question_count ?? 0}{' '}
                  <Trans i18nKey={'lms:questions.questionCount'} />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
