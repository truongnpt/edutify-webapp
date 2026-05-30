'use client';

import { useTransition } from 'react';

import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import { switchOrganizationAction } from '~/lib/lms/organizations/organization-memberships';

interface OrganizationOption {
  id: string;
  name: string;
  role: string;
}

interface OrganizationSwitcherProps {
  organizations: OrganizationOption[];
  activeOrganizationId: string;
}

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();

  if (organizations.length <= 1) {
    return null;
  }

  const onSwitch = (organizationId: string) => {
    if (organizationId === activeOrganizationId) return;

    startTransition(async () => {
      try {
        await switchOrganizationAction({ organizationId });
        toast.success(t('toast.orgSwitched'));
        window.location.reload();
      } catch {
        toast.error(t('toast.orgSwitchFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-2'}>
      <p className={'text-muted-foreground text-sm font-medium'}>
        <Trans i18nKey={'lms:organization.switchTitle'} />
      </p>
      <Select
        value={activeOrganizationId}
        onValueChange={onSwitch}
        disabled={pending}
      >
        <SelectTrigger>
          <div className={'flex items-center gap-2'}>
            <Building2 className={'size-4'} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name} ({org.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
