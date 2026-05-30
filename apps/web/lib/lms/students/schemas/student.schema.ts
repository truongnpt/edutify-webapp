import { z } from 'zod';

export const StudentStatusEnum = z.enum(['active', 'inactive', 'suspended']);

export const CreateStudentSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(320),
  status: StudentStatusEnum,
});

export const UpdateStudentSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(320),
  status: StudentStatusEnum,
});

export const DeleteStudentSchema = z.object({
  id: z.string().uuid(),
});

export const ImportStudentsSchema = z.object({
  students: z
    .array(
      z.object({
        fullName: z.string().min(1).max(255),
        email: z.string().email().max(320),
      }),
    )
    .min(1)
    .max(200),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type DeleteStudentInput = z.infer<typeof DeleteStudentSchema>;
