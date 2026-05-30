import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@kit/ui/bordered-navigation-menu';
import { LanguageToggle } from '@kit/ui/language-toggle';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import type { LmsNavigationConfig } from '~/lib/lms/navigation/get-navigation-for-user';

export function HomeMenuNavigation({
  navigationConfig,
}: {
  navigationConfig: LmsNavigationConfig;
}) {
  const routes = navigationConfig.routes.reduce<
    Array<{
      path: string;
      label: string;
      Icon?: React.ReactNode;
      end?: boolean | ((path: string) => boolean);
    }>
  >((acc, item) => {
    if ('children' in item) {
      return [...acc, ...item.children];
    }

    if ('divider' in item) {
      return acc;
    }

    return [...acc, item];
  }, []);

  return (
    <div className={'flex w-full flex-1 justify-between'}>
      <div className={'flex items-center space-x-8'}>
        <AppLogo />

        <BorderedNavigationMenu>
          {routes.map((route) => (
            <BorderedNavigationMenuItem {...route} key={route.path} />
          ))}
        </BorderedNavigationMenu>
      </div>

      <div className={'flex items-center justify-end space-x-2.5'}>
        <LanguageToggle />

        <ProfileAccountDropdownContainer showProfileName={false} />
      </div>
    </div>
  );
}
