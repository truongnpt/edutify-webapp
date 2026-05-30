import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { hasPermission } from '~/lib/lms/permissions/matrix';
import { loadMembers } from '~/lib/lms/members/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { MembersList } from './_components/members-list';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('lms:members.pageTitle') };
};

async function MembersPage() {
  const user = await requireUserInServerComponent();
  const { members, invites, currentUserId, currentUserRole } =
    await loadMembers(user.id);

  const canManage = hasPermission(currentUserRole, 'members', 'update');
  const isOwner = currentUserRole === 'owner';

  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'lms:members.pageTitle'} />}
        description={<Trans i18nKey={'lms:members.pageDescription'} />}
      />
      <PageBody>
        <MembersList
          members={members}
          invites={invites}
          currentUserId={currentUserId}
          canManage={canManage}
          isOwner={isOwner}
        />
      </PageBody>
    </>
  );
}

export default withI18n(MembersPage);
