import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    organization: z.string().min(1),
    questions: z.string().min(1),
    exams: z.string().min(1),
    examTake: z.string().min(1),
    students: z.string().min(1),
    assignments: z.string().min(1),
    myExams: z.string().min(1),
    grading: z.string().min(1),
    taxonomy: z.string().min(1),
    members: z.string().min(1),
    billing: z.string().min(1),
    adminPayments: z.string().min(1),
    reports: z.string().min(1),
    auditLogs: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home',
    profileSettings: '/home/settings',
    organization: '/home/organization',
    questions: '/home/questions',
    exams: '/home/exams',
    examTake: '/exam/take',
    students: '/home/students',
    assignments: '/home/assignments',
    myExams: '/home/my-exams',
    grading: '/home/grading',
    taxonomy: '/home/taxonomy',
    members: '/home/members',
    billing: '/home/billing',
    adminPayments: '/home/admin/payments',
    reports: '/home/reports',
    auditLogs: '/home/audit-logs',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
