import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import {
  loadAssignmentFormOptions,
  loadAssignments,
} from '~/lib/lms/assignments/server-actions';
import { loadExamBuilder } from '~/lib/lms/exams/server-actions';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { ExamBuilder } from './_components/exam-builder';
import { ExamAssignmentsSection } from './_components/exam-assignments-section';

interface ExamBuilderPageProps {
  params: Promise<{ examId: string }>;
}

async function ExamBuilderPage({ params }: ExamBuilderPageProps) {
  const { examId } = await params;
  const user = await requireUserInServerComponent();

  try {
    const data = await loadExamBuilder(user.id, examId);

    const assignmentData =
      data.exam.status === 'published' ?
        await Promise.all([
          loadAssignments(user.id, examId),
          loadAssignmentFormOptions(user.id),
        ])
      : null;

    return (
      <>
        <PageHeader title={data.exam.title} description={'Exam Builder'} />
        <PageBody>
          <ExamBuilder
            exam={data.exam}
            sections={data.sections}
            banks={data.banks}
            availableQuestions={data.availableQuestions}
            questionGroups={data.questionGroups}
            subjects={data.subjects}
          />
          {assignmentData && (
            <div className={'mt-8'}>
              <ExamAssignmentsSection
                context={assignmentData[0].context}
                assignments={assignmentData[0].assignments}
                exams={assignmentData[1].exams.filter((e) => e.id === examId)}
                students={assignmentData[1].students}
                examId={examId}
              />
            </div>
          )}
        </PageBody>
      </>
    );
  } catch {
    notFound();
  }
}

export default withI18n(ExamBuilderPage);
