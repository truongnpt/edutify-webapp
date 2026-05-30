import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import type {
  ExamReportRow,
  StudentReportRow,
} from '~/lib/lms/reports/server-actions';

interface ReportsViewProps {
  role: 'teacher' | 'student';
  examReports: ExamReportRow[];
  studentReports: StudentReportRow[];
}

function formatPercent(value: number | null) {
  return value != null ? `${value}%` : '—';
}

export function ReportsView({
  role,
  examReports,
  studentReports,
}: ReportsViewProps) {
  const isEmpty = examReports.length === 0 && studentReports.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className={'py-10 text-center'}>
          <p className={'text-muted-foreground text-sm'}>
            <Trans i18nKey={'lms:reports.empty'} />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={'flex flex-col gap-6'}>
      <Card>
        <CardHeader>
          <CardTitle className={'text-base'}>
            <Trans
              i18nKey={
                role === 'student' ?
                  'lms:reports.myExamPerformance'
                : 'lms:reports.examPerformance'
              }
            />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey={'lms:reports.examPerformanceDescription'} />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examReports.length === 0 ?
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:reports.empty'} />
            </p>
          : <div className={'overflow-x-auto'}>
              <table className={'w-full text-sm'}>
                <thead>
                  <tr className={'border-b text-left'}>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.examColumn'} />
                    </th>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.attemptsColumn'} />
                    </th>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.averageColumn'} />
                    </th>
                    <th className={'pb-2 font-medium'}>
                      <Trans i18nKey={'lms:reports.passRateColumn'} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {examReports.map((row) => (
                    <tr key={row.examId} className={'border-b last:border-0'}>
                      <td className={'py-3 pr-4'}>{row.examTitle}</td>
                      <td className={'py-3 pr-4'}>{row.attemptCount}</td>
                      <td className={'py-3 pr-4'}>
                        {formatPercent(row.averagePercent)}
                      </td>
                      <td className={'py-3'}>{formatPercent(row.passRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </CardContent>
      </Card>

      {role === 'teacher' && studentReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={'text-base'}>
              <Trans i18nKey={'lms:reports.studentPerformance'} />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey={'lms:reports.studentPerformanceDescription'} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={'overflow-x-auto'}>
              <table className={'w-full text-sm'}>
                <thead>
                  <tr className={'border-b text-left'}>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.studentColumn'} />
                    </th>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.attemptsColumn'} />
                    </th>
                    <th className={'pb-2 pr-4 font-medium'}>
                      <Trans i18nKey={'lms:reports.averageColumn'} />
                    </th>
                    <th className={'pb-2 font-medium'}>
                      <Trans i18nKey={'lms:reports.passRateColumn'} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.map((row) => (
                    <tr
                      key={row.studentId}
                      className={'border-b last:border-0'}
                    >
                      <td className={'py-3 pr-4'}>
                        <div className={'flex flex-col'}>
                          <span>{row.fullName}</span>
                          <span className={'text-muted-foreground text-xs'}>
                            {row.email}
                          </span>
                        </div>
                      </td>
                      <td className={'py-3 pr-4'}>{row.attemptCount}</td>
                      <td className={'py-3 pr-4'}>
                        {formatPercent(row.averagePercent)}
                      </td>
                      <td className={'py-3'}>{formatPercent(row.passRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
