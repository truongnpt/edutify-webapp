'use client';

import { Trans } from '@kit/ui/trans';

import { AssignmentsList } from '~/home/assignments/_components/assignments-list';
import type { OrganizationContext } from '~/lib/lms/types';

interface ExamAssignmentsSectionProps {
  context: OrganizationContext;
  assignments: Parameters<typeof AssignmentsList>[0]['assignments'];
  exams: Parameters<typeof AssignmentsList>[0]['exams'];
  students: Parameters<typeof AssignmentsList>[0]['students'];
  examId: string;
}

export function ExamAssignmentsSection(props: ExamAssignmentsSectionProps) {
  return (
    <div className={'flex flex-col gap-4'}>
      <div>
        <h2 className={'text-lg font-semibold'}>
          <Trans i18nKey={'lms:assignments.examSectionTitle'} />
        </h2>
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'lms:assignments.examSectionDescription'} />
        </p>
      </div>

      <AssignmentsList {...props} fixedExamId={props.examId} />
    </div>
  );
}
