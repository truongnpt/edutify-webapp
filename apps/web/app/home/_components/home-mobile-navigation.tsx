'use client';

import Link from 'next/link';

import { LogOut, Menu } from 'lucide-react';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { LanguageToggle } from '@kit/ui/language-toggle';
import { Separator } from '@kit/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '@kit/ui/sheet';
import { Trans } from '@kit/ui/trans';

import { navigationConfig as defaultNavigationConfig } from '~/config/navigation.config';
import type { LmsNavigationConfig } from '~/lib/lms/navigation/get-navigation-for-user';
import { AppLogo } from '~/components/app-logo';

/**
 * Mobile navigation for the home page
 * @constructor
 */
export function HomeMobileNavigation({
  navigationConfig = defaultNavigationConfig,
}: {
  navigationConfig?: LmsNavigationConfig;
}) {
  const signOut = useSignOut();

  const Links = navigationConfig.routes.map((item, index) => {
    if ('children' in item) {
      return item.children.map((child) => {
        return (
          <SheetNavLink
            key={child.path}
            Icon={child.Icon}
            path={child.path}
            label={child.label}
          />
        );
      });
    }

    if ('divider' in item) {
      return <Separator key={index} />;
    }
  });

  return (
    <div className={'flex items-center gap-2'}>
      <LanguageToggle />

      <Sheet>
        <SheetTrigger aria-label={'Open Menu'}>
          <Menu className={'h-9'} />
        </SheetTrigger>

        <SheetContent
          side={'left'}
          className={'flex h-full w-full flex-col sm:max-w-sm'}
        >
          <AppLogo />
          <nav className={'mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto'}>
            {Links}
          </nav>

          <Separator className={'my-0 shrink-0'} />

          <div className={'shrink-0'}>
            <SignOutNavItem onSignOut={() => signOut.mutateAsync()} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SheetNavLink(
  props: React.PropsWithChildren<{
    path: string;
    label: string;
    Icon: React.ReactNode;
  }>,
) {
  return (
    <SheetClose asChild>
      <Link
        href={props.path}
        className={
          'hover:bg-accent flex h-12 w-full items-center space-x-4 rounded-md px-3'
        }
      >
        {props.Icon}

        <span>
          <Trans i18nKey={props.label} defaults={props.label} />
        </span>
      </Link>
    </SheetClose>
  );
}

function SignOutNavItem(
  props: React.PropsWithChildren<{
    onSignOut: () => unknown;
  }>,
) {
  return (
    <SheetClose asChild>
      <button
        type={'button'}
        className={
          'hover:bg-accent flex h-12 w-full items-center space-x-4 rounded-md px-3'
        }
        onClick={props.onSignOut}
      >
        <LogOut className={'h-6'} />

        <span>
          <Trans i18nKey={'common:signOut'} defaults={'Sign out'} />
        </span>
      </button>
    </SheetClose>
  );
}
