'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarClock,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import {
  CreateAssignmentSchema,
  defaultAssignmentWindow,
  type AssignmentWindowStatus,
  type CreateAssignmentInput,
} from '~/lib/lms/assignments/schemas/assignment.schema';
import {
  createAssignmentAction,
  deleteAssignmentAction,
} from '~/lib/lms/assignments/server-actions';
import type { OrganizationContext } from '~/lib/lms/types';

interface AssignmentListItem {
  id: string;
  exam_id: string;
  student_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  window_status: AssignmentWindowStatus;
  exam: { id: string; title: string; status: string } | null;
  student: {
    id: string;
    full_name: string;
    email: string;
    status: string;
  } | null;
}

interface ExamOption {
  id: string;
  title: string;
  status: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

interface AssignmentsListProps {
  context: OrganizationContext;
  assignments: AssignmentListItem[];
  exams: ExamOption[];
  students: StudentOption[];
  fixedExamId?: string;
}

const STATUS_VARIANT: Record<
  AssignmentWindowStatus,
  'default' | 'secondary' | 'outline'
> = {
  upcoming: 'secondary',
  active: 'default',
  ended: 'outline',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function AssignmentsList({
  assignments,
  exams,
  students,
  fixedExamId,
}: AssignmentsListProps) {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const defaults = defaultAssignmentWindow();

  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver(CreateAssignmentSchema),
    defaultValues: {
      examId: fixedExamId ?? '',
      studentIds: [],
      startTime: defaults.startTime,
      endTime: defaults.endTime,
    },
  });

  const toggleStudent = (id: string, checked: boolean) => {
    setSelectedStudents((prev) => {
      const next = checked ? [...prev, id] : prev.filter((s) => s !== id);
      form.setValue('studentIds', next, { shouldValidate: true });
      return next;
    });
  };

  const selectAllStudents = () => {
    const ids = students.map((s) => s.id);
    setSelectedStudents(ids);
    form.setValue('studentIds', ids, { shouldValidate: true });
  };

  const onCreate = (data: CreateAssignmentInput) => {
    const payload =
      fixedExamId ? { ...data, examId: fixedExamId } : data;

    startTransition(async () => {
      try {
        const result = await createAssignmentAction(payload);
        toast.success(
          t('toast.assignmentCreated', {
            created: result.created,
            skippedPart:
              result.skipped > 0 ?
                t('toast.assignmentCreatedSkipped', { skipped: result.skipped })
              : '',
          }),
        );
        form.reset({
          examId: fixedExamId ?? '',
          studentIds: [],
          startTime: defaults.startTime,
          endTime: defaults.endTime,
        });
        setSelectedStudents([]);
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.assignmentCreateFailed'),
        );
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('Remove this assignment?')) return;

    startTransition(async () => {
      try {
        await deleteAssignmentAction({ id });
        toast.success(t('toast.assignmentRemoved'));
        router.refresh();
      } catch {
        toast.error(t('toast.assignmentRemoveFailed'));
      }
    });
  };

  const canAssign = exams.length > 0 && students.length > 0;

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center justify-between'}>
        <p className={'text-muted-foreground text-sm'}>
          {assignments.length}{' '}
          <Trans i18nKey={'lms:assignments.countLabel'} />
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canAssign}>
              <Plus className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:assignments.create'} />
            </Button>
          </DialogTrigger>

          <DialogContent className={'max-h-[90vh] overflow-y-auto sm:max-w-lg'}>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey={'lms:assignments.create'} />
              </DialogTitle>
            </DialogHeader>

            {!canAssign ?
              <p className={'text-muted-foreground text-sm'}>
                <Trans i18nKey={'lms:assignments.createBlocked'} />
              </p>
            : <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onCreate)}
                  className={'flex flex-col gap-4'}
                >
                  {!fixedExamId && (
                    <FormField
                      control={form.control}
                      name={'examId'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:assignments.examLabel'} />
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={'Select published exam'}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {exams.map((exam) => (
                                <SelectItem key={exam.id} value={exam.id}>
                                  {exam.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className={'grid grid-cols-2 gap-4'}>
                    <FormField
                      control={form.control}
                      name={'startTime'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:assignments.startTimeLabel'} />
                          </FormLabel>
                          <FormControl>
                            <Input type={'datetime-local'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={'endTime'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:assignments.endTimeLabel'} />
                          </FormLabel>
                          <FormControl>
                            <Input type={'datetime-local'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className={'flex flex-col gap-2'}>
                    <div className={'flex items-center justify-between'}>
                      <Label>
                        <Trans i18nKey={'lms:assignments.studentsLabel'} />
                      </Label>
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'sm'}
                        onClick={selectAllStudents}
                      >
                        <Trans i18nKey={'lms:assignments.selectAll'} />
                      </Button>
                    </div>

                    <div
                      className={
                        'border-input max-h-48 overflow-y-auto rounded-md border p-3'
                      }
                    >
                      <div className={'flex flex-col gap-2'}>
                        {students.map((student) => (
                          <div
                            key={student.id}
                            className={'flex items-center gap-2'}
                          >
                            <Checkbox
                              id={`assign-${student.id}`}
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) =>
                                toggleStudent(student.id, checked === true)
                              }
                            />
                            <Label
                              htmlFor={`assign-${student.id}`}
                              className={'font-normal'}
                            >
                              {student.full_name}
                              <span className={'text-muted-foreground ml-1 text-xs'}>
                                ({student.email})
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage>
                      {form.formState.errors.studentIds?.message}
                    </FormMessage>
                  </div>

                  <Button type={'submit'} disabled={pending}>
                    <Trans i18nKey={'lms:assignments.assignButton'} />
                  </Button>
                </form>
              </Form>
            }
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ?
        <Card>
          <CardContent className={'flex flex-col items-center gap-4 py-12'}>
            <CalendarClock className={'text-muted-foreground size-12'} />
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:assignments.empty'} />
            </p>
          </CardContent>
        </Card>
      : <div className={'grid gap-4 md:grid-cols-2'}>
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className={'flex flex-row items-start justify-between'}>
                <div className={'flex flex-col gap-2'}>
                  <CardTitle className={'text-base'}>
                    {assignment.exam ?
                      <Link
                        href={`${pathsConfig.app.exams}/${assignment.exam.id}`}
                        className={'hover:underline'}
                      >
                        {assignment.exam.title}
                      </Link>
                    : '—'}
                  </CardTitle>
                  <CardDescription>
                    {assignment.student?.full_name ?? '—'} ·{' '}
                    {assignment.student?.email ?? ''}
                  </CardDescription>
                  <div className={'flex flex-wrap gap-2'}>
                    <Badge variant={STATUS_VARIANT[assignment.window_status]}>
                      <Trans
                        i18nKey={`lms:assignments.status.${assignment.window_status}`}
                      />
                    </Badge>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} size={'icon'}>
                      <MoreHorizontal className={'size-4'} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={'end'}>
                    <DropdownMenuItem
                      className={'text-destructive'}
                      onClick={() => onDelete(assignment.id)}
                    >
                      <Trash2 className={'mr-2 size-4'} />
                      <Trans i18nKey={'lms:common.delete'} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className={'text-muted-foreground text-sm'}>
                <p>
                  <Trans i18nKey={'lms:assignments.startTimeLabel'} />:{' '}
                  {formatDateTime(assignment.start_time)}
                </p>
                <p>
                  <Trans i18nKey={'lms:assignments.endTimeLabel'} />:{' '}
                  {formatDateTime(assignment.end_time)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
