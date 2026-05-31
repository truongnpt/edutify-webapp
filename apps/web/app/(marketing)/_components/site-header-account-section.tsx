'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import type { JwtPayload } from '@supabase/supabase-js';

import { PersonalAccountDropdown } from '@kit/accounts/personal-account-dropdown';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const ModeToggle = dynamic(
  () =>
    import('@kit/ui/mode-toggle').then((mod) => ({
      default: mod.ModeToggle,
    })),
  {
    ssr: false,
  },
);

const LanguageToggle = dynamic(
  () =>
    import('@kit/ui/language-toggle').then((mod) => ({
      default: mod.LanguageToggle,
    })),
  {
    ssr: false,
  },
);

const paths = {
  home: pathsConfig.app.home,
};

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
};

export function SiteHeaderAccountSection({
  user,
}: React.PropsWithChildren<{
  user: JwtPayload | null;
}>) {
  if (!user) {
    return <AuthButtons />;
  }

  return (
    <div className={'flex items-center justify-end gap-2'}>
      <LanguageToggle />

      <SuspendedPersonalAccountDropdown user={user} />
    </div>
  );
}

function SuspendedPersonalAccountDropdown(props: { user: JwtPayload | null }) {
  const signOut = useSignOut();
  const user = useUser(props.user);
  const userData = user.data ?? props.user ?? null;

  if (userData) {
    return (
      <PersonalAccountDropdown
        showProfileName={false}
        paths={paths}
        features={features}
        user={userData}
        signOutRequested={() => signOut.mutateAsync()}
      />
    );
  }

  return <AuthButtons />;
}

function AuthButtons() {
  return (
    <>
      <div className={'flex shrink-0 items-center md:hidden'}>
        <If condition={features.enableThemeToggle}>
          <ModeToggle />
        </If>
      </div>

      <div className={'hidden shrink-0 items-center gap-2 md:flex'}>
        <LanguageToggle />

        <If condition={features.enableThemeToggle}>
          <ModeToggle />
        </If>

        <Button asChild size="sm" variant={'ghost'}>
          <Link href={pathsConfig.auth.signIn}>
            <Trans i18nKey={'auth:signIn'} />
          </Link>
        </Button>

        <Button asChild className="group" size="sm" variant={'default'}>
          <Link href={pathsConfig.auth.signUp}>
            <Trans i18nKey={'auth:signUp'} />
          </Link>
        </Button>
      </div>
    </>
  );
}
