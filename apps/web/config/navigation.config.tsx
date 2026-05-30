import { BookOpen, Building2, CalendarClock, ClipboardList, GraduationCap, Home, User } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'common:routes.questions',
        path: pathsConfig.app.questions,
        Icon: <BookOpen className={iconClasses} />,
      },
      {
        label: 'common:routes.exams',
        path: pathsConfig.app.exams,
        Icon: <ClipboardList className={iconClasses} />,
      },
      {
        label: 'common:routes.students',
        path: pathsConfig.app.students,
        Icon: <GraduationCap className={iconClasses} />,
      },
      {
        label: 'common:routes.assignments',
        path: pathsConfig.app.assignments,
        Icon: <CalendarClock className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.organization',
        path: pathsConfig.app.organization,
        Icon: <Building2 className={iconClasses} />,
      },
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
