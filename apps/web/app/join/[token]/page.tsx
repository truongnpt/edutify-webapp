import { notFound } from 'next/navigation';

import { loadInviteByToken } from '~/lib/lms/members/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { withI18n } from '~/lib/i18n/with-i18n';

import { JoinInvitePanel } from './_components/join-invite-panel';

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

async function JoinPage({ params }: JoinPageProps) {
  await requireUserInServerComponent();
  const { token } = await params;

  try {
    const { invite, organizationName } = await loadInviteByToken(token);

    return (
      <JoinInvitePanel
        token={token}
        organizationName={organizationName}
        email={invite.email}
        role={invite.role}
      />
    );
  } catch {
    notFound();
  }
}

export default withI18n(JoinPage);
