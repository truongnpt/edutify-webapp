import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadOrganizationSettings } from '~/lib/lms/organizations/server-actions';
import { loadUserOrganizations } from '~/lib/lms/organizations/organization-memberships';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { OrganizationSettingsForm } from './_components/organization-settings-form';
import { OrganizationSwitcher } from './_components/organization-switcher';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('lms:organization.pageTitle'),
  };
};

async function OrganizationSettingsPage() {
  const user = await requireUserInServerComponent();
  const [context, memberships] = await Promise.all([
    loadOrganizationSettings(user.id),
    loadUserOrganizations(user.id),
  ]);

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }));

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:organization.pageTitle'} />}
        description={<Trans i18nKey={'lms:organization.pageDescription'} />}
      />

      <PageBody>
        <div className={'flex w-full flex-1 flex-col gap-6 lg:max-w-2xl'}>
          <OrganizationSwitcher
            organizations={organizations}
            activeOrganizationId={context.organization.id}
          />
          <OrganizationSettingsForm context={context} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(OrganizationSettingsPage);
