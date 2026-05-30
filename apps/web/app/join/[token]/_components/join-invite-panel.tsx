'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import { acceptInviteAction } from '~/lib/lms/members/server-actions';

interface JoinInvitePanelProps {
  token: string;
  organizationName: string;
  email: string;
  role: string;
}

export function JoinInvitePanel({
  token,
  organizationName,
  email,
  role,
}: JoinInvitePanelProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const accept = () => {
    startTransition(async () => {
      try {
        await acceptInviteAction({ token });
        toast.success(t('toast.joinSuccess'));
        router.push(pathsConfig.app.home);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.joinFailed'),
        );
      }
    });
  };

  return (
    <div className={'flex min-h-screen items-center justify-center p-4'}>
      <Card className={'w-full max-w-md'}>
        <CardHeader className={'text-center'}>
          <CardTitle>
            <Trans i18nKey={'lms:members.joinTitle'} />
          </CardTitle>
        </CardHeader>
        <CardContent className={'flex flex-col gap-4 text-center'}>
          <p className={'text-muted-foreground text-sm'}>
            Join <strong>{organizationName}</strong> as{' '}
            <strong>{role}</strong>. Invite sent to <strong>{email}</strong>.
          </p>
          <Button onClick={accept} disabled={pending} className={'w-full'}>
            <Trans i18nKey={'lms:members.acceptInvite'} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
