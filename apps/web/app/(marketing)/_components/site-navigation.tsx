'use client';

import Link from 'next/link';

import { Menu } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { LanguageToggle } from '@kit/ui/language-toggle';
import { NavigationMenu, NavigationMenuList } from '@kit/ui/navigation-menu';
import { Separator } from '@kit/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '@kit/ui/sheet';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';

import { SiteNavigationItem } from './site-navigation-item';
import { AppLogo } from '~/components/app-logo';

/**
 * Add your navigation links here
 *
 * @example
 *
 * {
 *   FAQ: {
 *     label: 'marketing:faq',
 *     path: '/faq',
 *   },
 *   Pricing: {
 *     label: 'marketing:pricing',
 *     path: '/pricing',
 *   },
 * }
 */

const links: Record<
  string,
  {
    label: string;
    path: string;
  }
> = {
  Pricing: {
    label: 'marketing:pricing',
    path: '/pricing',
  },
  FAQ: {
    label: 'marketing:faq',
    path: '/faq',
  },
};

export function SiteNavigation() {
  const NavItems = Object.values(links).map((item) => {
    return (
      <SiteNavigationItem key={item.path} path={item.path}>
        <Trans i18nKey={item.label} />
      </SiteNavigationItem>
    );
  });

  return (
    <>
      <div className={'hidden items-center justify-center md:flex'}>
        <NavigationMenu className={'px-4 py-2'}>
          <NavigationMenuList className={'space-x-5'}>
            {NavItems}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className={'flex justify-start sm:items-center md:hidden'}>
        <MobileDropdown />
      </div>
    </>
  );
}

function MobileDropdown() {
  return (
    <Sheet>
      <SheetTrigger aria-label={'Open Menu'}>
        <Menu className={'h-8 w-8'} />
      </SheetTrigger>

      <SheetContent
        side={'left'}
        className={'flex h-full w-full flex-col sm:max-w-sm'}
      >
        <AppLogo />
        <nav className={'mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto'}>
          {Object.values(links).map((item) => {
            return (
              <SheetClose asChild key={item.path}>
                <Link
                  href={item.path}
                  className={
                    'hover:bg-accent flex h-12 w-full items-center rounded-md px-3'
                  }
                >
                  <Trans i18nKey={item.label} />
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <Separator className={'my-4 shrink-0'} />

        <div className={'flex shrink-0 items-center justify-between gap-2 pb-2'}>
          <LanguageToggle />

          <div className={'flex items-center justify-end gap-2'}>
            <SheetClose asChild>
              <Button asChild size="sm" variant={'ghost'}>
                <Link href={pathsConfig.auth.signIn}>
                  <Trans i18nKey={'auth:signIn'} />
                </Link>
              </Button>
            </SheetClose>

            <SheetClose asChild>
              <Button asChild className="group" size="sm" variant={'default'}>
                <Link href={pathsConfig.auth.signUp}>
                  <Trans i18nKey={'auth:signUp'} />
                </Link>
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
