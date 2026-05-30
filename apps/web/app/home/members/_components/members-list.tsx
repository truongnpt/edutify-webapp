'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Plus, Trash2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import { Trans } from '@kit/ui/trans';

import {
  CreateInviteSchema,
  type CreateInviteInput,
} from '~/lib/lms/members/schemas/invite.schema';
import {
  cancelInviteAction,
  createInviteAction,
  removeMemberAction,
  updateMemberRoleAction,
} from '~/lib/lms/members/server-actions';

import { PermissionsMatrixPanel } from './permissions-matrix-panel';

interface MemberItem {
  id: string;
  user_id: string;
  role: string;
  status: string;
}

interface InviteItem {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

interface MembersListProps {
  members: MemberItem[];
  invites: InviteItem[];
  currentUserId: string;
  canManage: boolean;
  isOwner: boolean;
}

const ASSIGNABLE_ROLES = ['admin', 'teacher', 'student'] as const;

export function MembersList({
  members,
  invites,
  currentUserId,
  canManage,
  isOwner,
}: MembersListProps) {
  const { t } = useTranslation('lms');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const form = useForm<CreateInviteInput>({
    resolver: zodResolver(CreateInviteSchema),
    defaultValues: { email: '', role: 'teacher' },
  });

  const onInvite = (data: CreateInviteInput) => {
    startTransition(async () => {
      try {
        const result = await createInviteAction(data);
        const link = `${window.location.origin}/join/${result.token}`;

        setLastInviteLink(link);
        toast.success(t('toast.inviteCreated'));
        form.reset({ email: '', role: 'teacher' });
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.inviteFailed'),
        );
      }
    });
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/join/${token}`;
    void navigator.clipboard.writeText(link);
    toast.success(t('toast.linkCopied'));
  };

  const onRoleChange = (memberId: string, role: string) => {
    startTransition(async () => {
      try {
        await updateMemberRoleAction({
          memberId,
          role: role as 'admin' | 'teacher' | 'student',
        });
        toast.success(t('toast.memberRoleUpdated'));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.memberRoleFailed'),
        );
      }
    });
  };

  const onRemoveMember = (memberId: string) => {
    if (!window.confirm(t('members.removeConfirm'))) return;

    startTransition(async () => {
      try {
        await removeMemberAction({ memberId });
        toast.success(t('toast.memberRemoved'));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.memberRemoveFailed'),
        );
      }
    });
  };

  return (
    <div className={'flex flex-col gap-6'}>
      {canManage && (
        <div className={'flex justify-end'}>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className={'mr-2 size-4'} />
                <Trans i18nKey={'lms:members.invite'} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans i18nKey={'lms:members.invite'} />
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onInvite)}
                  className={'flex flex-col gap-4'}
                >
                  <FormField
                    control={form.control}
                    name={'email'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:members.emailLabel'} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type={'email'} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={'role'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:members.roleLabel'} />
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isOwner && (
                              <SelectItem value={'admin'}>Admin</SelectItem>
                            )}
                            <SelectItem value={'teacher'}>Teacher</SelectItem>
                            <SelectItem value={'student'}>Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button type={'submit'} disabled={pending}>
                    <Plus className={'mr-2 size-4'} />
                    <Trans i18nKey={'lms:members.sendInvite'} />
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {lastInviteLink && (
        <Card>
          <CardContent className={'flex items-center gap-2 py-4 text-sm'}>
            <code className={'flex-1 truncate'}>{lastInviteLink}</code>
            <Button
              size={'sm'}
              variant={'outline'}
              onClick={() => {
                void navigator.clipboard.writeText(lastInviteLink);
                toast.success(t('toast.linkCopied'));
              }}
            >
              <Copy className={'size-4'} />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:members.activeMembers'} />
          </CardTitle>
        </CardHeader>
        <CardContent className={'flex flex-col gap-2'}>
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const canEditMember =
              canManage && !isSelf && member.role !== 'owner';

            return (
              <div
                key={member.id}
                className={'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm'}
              >
                <span className={'text-muted-foreground font-mono text-xs'}>
                  {member.user_id.slice(0, 8)}…
                  {isSelf && (
                    <Badge variant={'secondary'} className={'ml-2'}>
                      <Trans i18nKey={'lms:members.you'} />
                    </Badge>
                  )}
                </span>
                <div className={'flex items-center gap-2'}>
                  {canEditMember ?
                    <Select
                      value={member.role}
                      disabled={pending}
                      onValueChange={(value) => onRoleChange(member.id, value)}
                    >
                      <SelectTrigger className={'w-32'}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.filter(
                          (role) => isOwner || role !== 'admin',
                        ).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  : <Badge variant={'outline'}>{member.role}</Badge>}
                  <Badge variant={'secondary'}>{member.status}</Badge>
                  {canEditMember && (
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      disabled={pending}
                      onClick={() => onRemoveMember(member.id)}
                    >
                      <Trash2 className={'size-4'} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={'text-base'}>
            <Trans i18nKey={'lms:members.pendingInvites'} />
          </CardTitle>
        </CardHeader>
        <CardContent className={'flex flex-col gap-2'}>
          {invites.length === 0 ?
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:members.emptyInvites'} />
            </p>
          : invites.map((invite) => (
              <div
                key={invite.id}
                className={'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm'}
              >
                <div className={'flex flex-col gap-1'}>
                  <span>{invite.email}</span>
                  <Badge variant={'outline'} className={'w-fit'}>
                    {invite.role}
                  </Badge>
                </div>
                {canManage && (
                  <div className={'flex gap-1'}>
                    <Button
                      size={'sm'}
                      variant={'outline'}
                      onClick={() => copyLink(invite.token)}
                    >
                      <Copy className={'mr-1 size-4'} />
                      <Trans i18nKey={'lms:members.copyLink'} />
                    </Button>
                    <Button
                      size={'sm'}
                      variant={'ghost'}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await cancelInviteAction({ id: invite.id });
                            toast.success(t('toast.inviteCancelled'));
                          } catch {
                            toast.error(t('toast.inviteCancelFailed'));
                          }
                        });
                      }}
                    >
                      <Trash2 className={'size-4'} />
                    </Button>
                  </div>
                )}
              </div>
            ))
          }
        </CardContent>
      </Card>

      <PermissionsMatrixPanel />
    </div>
  );
}
