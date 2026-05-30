import type { OrganizationRole } from '~/lib/lms/types';
import pathsConfig from '~/config/paths.config';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';
import {
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FolderTree,
  GraduationCap,
  Home,
  PenLine,
  PenTool,
  ShieldCheck,
  BarChart3,
  ScrollText,
  User,
  Users,
} from 'lucide-react';

const iconClasses = 'w-4';

interface NavigationOptions {
  isPlatformAdmin?: boolean;
}

const teacherApplicationRoutes = [
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
  {
    label: 'common:routes.grading',
    path: pathsConfig.app.grading,
    Icon: <PenTool className={iconClasses} />,
  },
  {
    label: 'common:routes.reports',
    path: pathsConfig.app.reports,
    Icon: <BarChart3 className={iconClasses} />,
  },
  {
    label: 'common:routes.taxonomy',
    path: pathsConfig.app.taxonomy,
    Icon: <FolderTree className={iconClasses} />,
  },
];

const ownerExtraRoutes = [
  {
    label: 'common:routes.members',
    path: pathsConfig.app.members,
    Icon: <Users className={iconClasses} />,
  },
  {
    label: 'common:routes.auditLogs',
    path: pathsConfig.app.auditLogs,
    Icon: <ScrollText className={iconClasses} />,
  },
  {
    label: 'common:routes.billing',
    path: pathsConfig.app.billing,
    Icon: <CreditCard className={iconClasses} />,
  },
];

const studentApplicationRoutes = [
  {
    label: 'common:routes.home',
    path: pathsConfig.app.home,
    Icon: <Home className={iconClasses} />,
    end: true,
  },
  {
    label: 'common:routes.myExams',
    path: pathsConfig.app.myExams,
    Icon: <PenLine className={iconClasses} />,
  },
  {
    label: 'common:routes.reports',
    path: pathsConfig.app.reports,
    Icon: <BarChart3 className={iconClasses} />,
  },
];

const settingsRoutes = [
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
];

const studentSettingsRoutes = [
  {
    label: 'common:routes.profile',
    path: pathsConfig.app.profileSettings,
    Icon: <User className={iconClasses} />,
  },
];

const adminRoutes = [
  {
    label: 'common:routes.adminPayments',
    path: pathsConfig.app.adminPayments,
    Icon: <ShieldCheck className={iconClasses} />,
  },
];

export function getLmsNavigationConfig(
  role: OrganizationRole,
  options: NavigationOptions = {},
) {
  const isStudent = role === 'student';
  const isOwner = role === 'owner';
  const isOwnerOrAdmin = role === 'owner' || role === 'admin';

  const applicationRoutes =
    isStudent ? studentApplicationRoutes : (
      [
        ...teacherApplicationRoutes,
        ...(isOwnerOrAdmin ?
          [ownerExtraRoutes[0]!, ownerExtraRoutes[1]!]
        : []),
        ...(isOwner ? [ownerExtraRoutes[2]!] : []),
      ]
    );

  const routes = [
    {
      label: 'common:routes.application',
      children: applicationRoutes,
    },
  ];

  if (options.isPlatformAdmin) {
    routes.push({
      label: 'common:routes.admin',
      children: adminRoutes,
    });
  }

  routes.push({
    label: 'common:routes.settings',
    children: isStudent ? studentSettingsRoutes : settingsRoutes,
  });

  return NavigationConfigSchema.parse({
    routes,
    style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
    sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
  });
}
