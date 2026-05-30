import { z } from 'zod';

export const CreateAssignmentSchema = z
  .object({
    examId: z.string().uuid(),
    studentIds: z.array(z.string().uuid()).min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const DeleteAssignmentSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type DeleteAssignmentInput = z.infer<typeof DeleteAssignmentSchema>;

export type AssignmentWindowStatus = 'upcoming' | 'active' | 'ended';

export function getAssignmentWindowStatus(
  startTime: string,
  endTime: string,
  now = new Date(),
): AssignmentWindowStatus {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

export function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

export function defaultAssignmentWindow() {
  const start = new Date();
  start.setMinutes(start.getMinutes() - start.getMinutes() % 15);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const toLocalInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return {
    startTime: toLocalInput(start),
    endTime: toLocalInput(end),
  };
}
