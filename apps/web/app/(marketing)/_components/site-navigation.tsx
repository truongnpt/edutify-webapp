import Link from 'next/link';

import { Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuList } from '@kit/ui/navigation-menu';
import { Trans } from '@kit/ui/trans';

import { SiteNavigationItem } from './site-navigation-item';
import { Separator } from '@kit/ui/separator';
import { LanguageToggle } from '@kit/ui/language-toggle';
import { Button } from '@kit/ui/button';
import pathsConfig from '~/config/paths.config';
import { If } from '@kit/ui/if';
import { ModeToggle } from '@kit/ui/mode-toggle';
import featuresFlagConfig from '~/config/feature-flags.config';

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

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
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
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={'Open Menu'}>
        <Menu className={'h-8 w-8'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent className={'relative w-full translate-y-2 h-[calc(100vh-60px)]'}>
        {Object.values(links).map((item) => {
          const className = 'flex w-full h-12 items-center';

          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link className={className} href={item.path}>
                <Trans i18nKey={item.label} />
              </Link>
            </DropdownMenuItem>
          );
        })}
        <div className="absolute bottom-0 left-0 right-0 py-2">
          <Separator className="mb-2" />
          <div className="flex items-center justify-between gap-2 px-">
            <LanguageToggle />
            <div className="flex items-center justify-end gap-2">
              <If condition={features.enableThemeToggle}>
                <ModeToggle />
              </If>
              <Button asChild size="sm">
                <Link href={pathsConfig.auth.signIn}>
                  <Trans i18nKey={'auth:signIn'} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
