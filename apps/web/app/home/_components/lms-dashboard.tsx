import type { ReactNode } from 'react';

import Link from 'next/link';

import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  PenLine,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';

interface TeacherStats {
  studentCount: number;
  examCount: number;
  questionCount: number;
  assignmentCount: number;
  passRate: number | null;
  recentAttempts: Array<{
    id: string;
    score: number | null;
    max_score: number | null;
    status: string;
    submitted_at: string | null;
    examTitle: string;
  }>;
}

interface StudentStats {
  activeAssignments: number;
  completedAttempts: number;
  averageScorePercent: number | null;
}

interface LmsDashboardProps {
  role: 'teacher' | 'student';
  stats: TeacherStats | StudentStats;
}

function StatCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: ReactNode;
  value: string | number;
  description?: ReactNode;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'hover:bg-muted/50 transition-colors' : undefined}>
      <CardHeader className={'flex flex-row items-center justify-between pb-2'}>
        <CardTitle className={'text-sm font-medium'}>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={'text-2xl font-bold'}>{value}</p>
        {description && (
          <CardDescription className={'mt-1'}>{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function LmsDashboard({ role, stats }: LmsDashboardProps) {
  if (role === 'student') {
    const s = stats as StudentStats;

    return (
      <div className={'flex flex-col gap-6'}>
        <div className={'grid gap-4 md:grid-cols-3'}>
          <StatCard
            title={<Trans i18nKey={'lms:dashboard.activeAssignments'} />}
            value={s.activeAssignments}
            icon={<CalendarClock className={'text-muted-foreground size-4'} />}
            href={pathsConfig.app.myExams}
          />
          <StatCard
            title={<Trans i18nKey={'lms:dashboard.completedExams'} />}
            value={s.completedAttempts}
            icon={<PenLine className={'text-muted-foreground size-4'} />}
            href={pathsConfig.app.myExams}
          />
          <StatCard
            title={<Trans i18nKey={'lms:dashboard.averageScore'} />}
            value={
              s.averageScorePercent != null ?
                `${s.averageScorePercent}%`
              : '—'
            }
            icon={<TrendingUp className={'text-muted-foreground size-4'} />}
          />
        </div>
      </div>
    );
  }

  const t = stats as TeacherStats;

  return (
    <div className={'flex flex-col gap-6'}>
      <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-4'}>
        <StatCard
          title={<Trans i18nKey={'lms:dashboard.students'} />}
          value={t.studentCount}
          icon={<GraduationCap className={'text-muted-foreground size-4'} />}
          href={pathsConfig.app.students}
        />
        <StatCard
          title={<Trans i18nKey={'lms:dashboard.exams'} />}
          value={t.examCount}
          icon={<ClipboardList className={'text-muted-foreground size-4'} />}
          href={pathsConfig.app.exams}
        />
        <StatCard
          title={<Trans i18nKey={'lms:dashboard.questions'} />}
          value={t.questionCount}
          icon={<BookOpen className={'text-muted-foreground size-4'} />}
          href={pathsConfig.app.questions}
        />
        <StatCard
          title={<Trans i18nKey={'lms:dashboard.assignments'} />}
          value={t.assignmentCount}
          icon={<CalendarClock className={'text-muted-foreground size-4'} />}
          href={pathsConfig.app.assignments}
        />
      </div>

      {t.passRate != null && (
        <Card>
          <CardHeader>
            <CardTitle className={'text-base'}>
              <Trans i18nKey={'lms:dashboard.passRate'} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={'text-3xl font-bold'}>{t.passRate}%</p>
          </CardContent>
        </Card>
      )}

      {t.recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={'text-base'}>
              <Trans i18nKey={'lms:dashboard.recentAttempts'} />
            </CardTitle>
          </CardHeader>
          <CardContent className={'flex flex-col gap-3'}>
            {t.recentAttempts.map((item) => (
              <div
                key={item.id}
                className={'flex items-center justify-between gap-2 text-sm'}
              >
                <span>{item.examTitle}</span>
                <div className={'flex items-center gap-2'}>
                  {item.score != null && item.max_score != null && (
                    <span className={'text-muted-foreground'}>
                      {item.score}/{item.max_score}
                    </span>
                  )}
                  <Badge variant={'outline'}>{item.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
