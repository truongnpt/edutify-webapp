import { use } from 'react';

import { cookies } from 'next/headers';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { getNavigationForUser } from '~/lib/lms/navigation/get-navigation-for-user';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

function HomeLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());

  if (style === 'sidebar') {
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  return <HeaderLayout>{children}</HeaderLayout>;
}

export default withI18n(HomeLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const sidebarDefaultOpen = !navigationConfig.sidebarCollapsed;
  const [user, navConfig] = use(
    Promise.all([
      requireUserInServerComponent(),
      requireUserInServerComponent().then((u) => getNavigationForUser(u.id)),
    ]),
  );

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <Page style={'sidebar'}>
        <PageNavigation>
          <HomeSidebar user={user} navigationConfig={navConfig} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between gap-2'}>
          <MobileNavigation navigationConfig={navConfig} />
        </PageMobileNavigation>

        {children}
      </Page>
    </SidebarProvider>
  );
}

function HeaderLayout({ children }: React.PropsWithChildren) {
  const navConfig = use(
    requireUserInServerComponent().then((u) => getNavigationForUser(u.id)),
  );

  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation navigationConfig={navConfig} />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation navigationConfig={navConfig} />
      </PageMobileNavigation>

      {children}
    </Page>
  );
}

function MobileNavigation({
  navigationConfig,
}: {
  navigationConfig: Awaited<ReturnType<typeof getNavigationForUser>>;
}) {
  return (
    <>
      <AppLogo />

      <HomeMobileNavigation navigationConfig={navigationConfig} />
    </>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();

  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style
  );
}
