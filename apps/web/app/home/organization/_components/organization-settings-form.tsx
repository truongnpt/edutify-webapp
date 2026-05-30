'use client';

import { useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import type { OrganizationContext } from '~/lib/lms/types';

import {
  UpdateOrganizationSchema,
  type UpdateOrganizationInput,
} from '~/lib/lms/organizations/schemas/update-organization.schema';
import { updateOrganizationAction } from '~/lib/lms/organizations/server-actions';

interface OrganizationSettingsFormProps {
  context: OrganizationContext;
}

export function OrganizationSettingsForm({
  context,
}: OrganizationSettingsFormProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(UpdateOrganizationSchema),
    defaultValues: {
      name: context.organization.name,
      logoUrl: context.organization.logo_url ?? '',
    },
  });

  const onSubmit = (data: UpdateOrganizationInput) => {
    startTransition(async () => {
      try {
        await updateOrganizationAction(data);
        toast.success(t('toast.orgUpdated'));
      } catch {
        toast.error(t('toast.orgUpdateFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-6'}>
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey={'lms:organization.title'} />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey={'lms:organization.description'} />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={'flex flex-col gap-4'}
            >
              <FormField
                control={form.control}
                name={'name'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:organization.nameLabel'} />
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
                name={'logoUrl'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:organization.logoLabel'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={'https://...'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type={'submit'} disabled={pending}>
                <Trans i18nKey={'lms:common.save'} />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {context.plan && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey={'lms:organization.planTitle'} />
            </CardTitle>
          </CardHeader>
          <CardContent className={'flex flex-col gap-2 text-sm'}>
            <p>
              <span className={'text-muted-foreground'}>
                <Trans i18nKey={'lms:organization.currentPlan'} />:
              </span>{' '}
              {context.plan.name}
            </p>
            <p>
              <span className={'text-muted-foreground'}>
                <Trans i18nKey={'lms:organization.maxQuestions'} />:
              </span>{' '}
              {context.plan.max_questions}
            </p>
            <p>
              <span className={'text-muted-foreground'}>
                <Trans i18nKey={'lms:organization.maxExams'} />:
              </span>{' '}
              {context.plan.max_exams}
            </p>
            <p>
              <span className={'text-muted-foreground'}>
                <Trans i18nKey={'lms:organization.maxStudents'} />:
              </span>{' '}
              {context.plan.max_students}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
