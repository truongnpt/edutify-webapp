export type OrganizationRole = 'owner' | 'admin' | 'teacher' | 'student';

export type MemberStatus = 'active' | 'invited' | 'suspended';

export type {
  AssessmentQuestionType,
  QuestionTypeCategory,
} from '~/lib/lms/assessment/question-types';

/** @deprecated Use AssessmentQuestionType — kept for UI compat */
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'essay'
  | 'fill_blank';

export type QuestionStatus = 'draft' | 'published' | 'archived';

export type GradingMode = 'auto' | 'manual' | 'ai' | 'hybrid';

export type AttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'expired';

export type ExamStatus = 'draft' | 'published' | 'archived' | 'closed';

export type QuestionGroupType =
  | 'passage'
  | 'audio'
  | 'image'
  | 'video'
  | 'case_study'
  | 'document'
  | 'none';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'trialing';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type LmsModule =
  | 'organization'
  | 'members'
  | 'questionBank'
  | 'questions'
  | 'exams'
  | 'assignments'
  | 'students'
  | 'attempts'
  | 'reports'
  | 'subscription'
  | 'billing';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MemberStatus;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  max_students: number;
  max_exams: number;
  max_questions: number;
  price_monthly: number;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expired_at: string | null;
  plan?: Plan;
}

export interface Subject {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface Topic {
  id: string;
  organization_id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
}

export interface Tag {
  id: string;
  organization_id: string;
  name: string;
}

export interface QuestionBank {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  subject_id?: string | null;
  topic_id?: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface QuestionGroup {
  id: string;
  organization_id: string;
  bank_id: string;
  title: string;
  group_type: QuestionGroupType;
  shared_content: string | null;
  resource_url: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;
  organization_id: string;
  bank_id: string;
  question_type: string;
  /** UI backward compat alias */
  type?: string;
  title: string | null;
  content: string;
  explanation: string | null;
  difficulty: string;
  metadata?: Record<string, unknown>;
  answer_schema?: Record<string, unknown>;
  scoring_schema?: Record<string, unknown>;
  status?: QuestionStatus;
  grading_mode?: GradingMode;
  question_group_id?: string | null;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
}

export interface Exam {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  pass_score: number;
  total_score: number;
  status: ExamStatus;
  metadata: Record<string, unknown>;
}

export interface ExamAttempt {
  id: string;
  organization_id: string;
  exam_id: string;
  student_id: string;
  score: number | null;
  max_score: number | null;
  status: AttemptStatus;
  started_at: string | null;
  submitted_at: string | null;
}

export type StudentStatus = 'active' | 'inactive' | 'suspended';

export interface Student {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationContext {
  organization: Organization;
  membership: OrganizationMember;
  subscription: Subscription | null;
  plan: Plan | null;
}
