/**
 * Domain-agnostic question type registry.
 * Validated at application layer — no DB enum lock-in.
 */

export const QUESTION_TYPE_CATEGORIES = {
  choice: [
    'single_choice',
    'multiple_choice',
    'true_false',
    'yes_no',
  ],
  text: ['fill_blank', 'short_answer', 'paragraph_answer'],
  matching: [
    'matching_pairs',
    'matching_headings',
    'matching_features',
    'matching_information',
  ],
  ordering: ['drag_drop_order', 'sequence_order'],
  labeling: ['image_labeling', 'diagram_labeling', 'map_labeling'],
  open: ['essay', 'file_upload', 'audio_response', 'coding', 'spreadsheet_task'],
} as const;

export type QuestionTypeCategory = keyof typeof QUESTION_TYPE_CATEGORIES;

export type AssessmentQuestionType =
  (typeof QUESTION_TYPE_CATEGORIES)[QuestionTypeCategory][number];

export const ALL_QUESTION_TYPES = Object.values(
  QUESTION_TYPE_CATEGORIES,
).flat() as AssessmentQuestionType[];

export const LEGACY_QUESTION_TYPES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'essay',
  'fill_blank',
] as const satisfies readonly AssessmentQuestionType[];

export type LegacyQuestionType = (typeof LEGACY_QUESTION_TYPES)[number];

export function isAssessmentQuestionType(
  value: string,
): value is AssessmentQuestionType {
  return (ALL_QUESTION_TYPES as readonly string[]).includes(value);
}

export function getQuestionCategory(
  type: AssessmentQuestionType,
): QuestionTypeCategory {
  for (const [category, types] of Object.entries(QUESTION_TYPE_CATEGORIES)) {
    if ((types as readonly string[]).includes(type)) {
      return category as QuestionTypeCategory;
    }
  }

  throw new Error(`Unknown question type: ${type}`);
}

export function getDefaultGradingMode(
  type: AssessmentQuestionType,
): 'auto' | 'manual' | 'ai' | 'hybrid' {
  const category = getQuestionCategory(type);

  switch (category) {
    case 'open':
      if (type === 'essay' || type === 'audio_response') {
        return 'manual';
      }

      return 'manual';
    case 'choice':
    case 'text':
      if (type === 'paragraph_answer') {
        return 'manual';
      }

      return 'auto';
    case 'matching':
    case 'ordering':
    case 'labeling':
      return 'auto';
    default:
      return 'manual';
  }
}

export function requiresOptions(type: AssessmentQuestionType): boolean {
  return getQuestionCategory(type) === 'choice';
}

export function supportsAutoGrading(type: AssessmentQuestionType): boolean {
  return getDefaultGradingMode(type) === 'auto';
}
