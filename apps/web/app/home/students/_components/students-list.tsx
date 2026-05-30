'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm, type UseFormReturn } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import {
  CreateStudentSchema,
  UpdateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from '~/lib/lms/students/schemas/student.schema';
import {
  createStudentAction,
  deleteStudentAction,
  updateStudentAction,
} from '~/lib/lms/students/server-actions';
import type { OrganizationContext } from '~/lib/lms/types';

import { StudentImportDialog } from './student-import-dialog';

interface StudentListItem {
  id: string;
  full_name: string;
  email: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

interface StudentsListProps {
  context: OrganizationContext;
  students: StudentListItem[];
}

type StudentFormValues = Pick<
  CreateStudentInput,
  'fullName' | 'email' | 'status'
>;

function StudentFormFields({
  form,
}: {
  form: UseFormReturn<StudentFormValues>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={'fullName'}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey={'lms:students.fullNameLabel'} />
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'email'}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey={'lms:students.emailLabel'} />
            </FormLabel>
            <FormControl>
              <Input type={'email'} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={'status'}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey={'lms:students.statusLabel'} />
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={'active'}>
                  <Trans i18nKey={'lms:students.statusActive'} />
                </SelectItem>
                <SelectItem value={'inactive'}>
                  <Trans i18nKey={'lms:students.statusInactive'} />
                </SelectItem>
                <SelectItem value={'suspended'}>
                  <Trans i18nKey={'lms:students.statusSuspended'} />
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function StudentsList({ context, students }: StudentsListProps) {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentListItem | null>(null);
  const [pending, startTransition] = useTransition();

  const createForm = useForm<CreateStudentInput>({
    resolver: zodResolver(CreateStudentSchema),
    defaultValues: {
      fullName: '',
      email: '',
      status: 'active',
    },
  });

  const editForm = useForm<UpdateStudentInput>({
    resolver: zodResolver(UpdateStudentSchema),
    defaultValues: {
      id: '',
      fullName: '',
      email: '',
      status: 'active',
    },
  });

  const openEdit = (student: StudentListItem) => {
    editForm.reset({
      id: student.id,
      fullName: student.full_name,
      email: student.email,
      status: student.status as UpdateStudentInput['status'],
    });
    setEditStudent(student);
  };

  const onCreate = (data: CreateStudentInput) => {
    startTransition(async () => {
      try {
        await createStudentAction(data);
        toast.success(t('toast.studentCreated'));
        createForm.reset();
        setCreateOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.studentCreateFailed'),
        );
      }
    });
  };

  const onUpdate = (data: UpdateStudentInput) => {
    startTransition(async () => {
      try {
        await updateStudentAction(data);
        toast.success(t('toast.studentUpdated'));
        setEditStudent(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.studentUpdateFailed'),
        );
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('Delete this student?')) return;

    startTransition(async () => {
      try {
        await deleteStudentAction({ id });
        toast.success(t('toast.studentDeleted'));
        router.refresh();
      } catch {
        toast.error(t('toast.studentDeleteFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex items-center justify-between'}>
        <p className={'text-muted-foreground text-sm'}>
          {students.length} / {context.plan?.max_students ?? 20}{' '}
          <Trans i18nKey={'lms:students.quotaHint'} />
        </p>

        <div className={'flex gap-2'}>
          <StudentImportDialog />

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={'mr-2 size-4'} />
              <Trans i18nKey={'lms:students.create'} />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey={'lms:students.create'} />
              </DialogTitle>
            </DialogHeader>

            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(onCreate)}
                className={'flex flex-col gap-4'}
              >
                <StudentFormFields form={createForm} />
                <Button type={'submit'} disabled={pending}>
                  <Trans i18nKey={'lms:common.create'} />
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog
        open={editStudent !== null}
        onOpenChange={(open) => {
          if (!open) setEditStudent(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:students.edit'} />
            </DialogTitle>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdate)}
              className={'flex flex-col gap-4'}
            >
              <StudentFormFields
                form={editForm as unknown as UseFormReturn<StudentFormValues>}
              />
              <Button type={'submit'} disabled={pending}>
                <Trans i18nKey={'lms:common.save'} />
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {students.length === 0 ? (
        <Card>
          <CardContent className={'flex flex-col items-center gap-4 py-12'}>
            <GraduationCap className={'text-muted-foreground size-12'} />
            <p className={'text-muted-foreground text-sm'}>
              <Trans i18nKey={'lms:students.empty'} />
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
          {students.map((student) => (
            <Card key={student.id}>
              <CardHeader className={'flex flex-row items-start justify-between'}>
                <div className={'flex flex-col gap-2'}>
                  <CardTitle className={'text-base'}>{student.full_name}</CardTitle>
                  <CardDescription>{student.email}</CardDescription>
                  <div className={'flex flex-wrap gap-2'}>
                    <Badge variant={'outline'}>{student.status}</Badge>
                    {student.user_id ?
                      <Badge variant={'secondary'}>
                        <Trans i18nKey={'lms:students.linked'} />
                      </Badge>
                    : <Badge variant={'outline'}>
                        <Trans i18nKey={'lms:students.notLinked'} />
                      </Badge>
                    }
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={'ghost'} size={'icon'}>
                      <MoreHorizontal className={'size-4'} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={'end'}>
                    <DropdownMenuItem onClick={() => openEdit(student)}>
                      <Pencil className={'mr-2 size-4'} />
                      <Trans i18nKey={'lms:students.edit'} />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={'text-destructive'}
                      onClick={() => onDelete(student.id)}
                    >
                      <Trash2 className={'mr-2 size-4'} />
                      <Trans i18nKey={'lms:common.delete'} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
