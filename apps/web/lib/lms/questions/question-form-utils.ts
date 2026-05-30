import type { AssessmentQuestionType } from '~/lib/lms/assessment/question-types';
import type { Question } from '~/lib/lms/types';

import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from './schemas/question.schema';

export const MATCHING_TYPES = [
  'matching_pairs',
  'matching_headings',
  'matching_features',
  'matching_information',
] as const;

export const ORDERING_TYPES = ['sequence_order', 'drag_drop_order'] as const;

export const LABELING_TYPES = [
  'image_labeling',
  'diagram_labeling',
  'map_labeling',
] as const;

export const OPEN_FILE_TYPES = [
  'file_upload',
  'audio_response',
  'spreadsheet_task',
] as const;

export const OPEN_TEXT_TYPES = [
  'essay',
  'paragraph_answer',
  'coding',
] as const;

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  yes_no: 'Yes/No',
  essay: 'Essay',
  fill_blank: 'Fill Blank',
  short_answer: 'Short Answer',
  paragraph_answer: 'Paragraph Answer',
  file_upload: 'File Upload',
  matching_pairs: 'Matching Pairs',
  matching_headings: 'Matching Headings',
  matching_features: 'Matching Features',
  matching_information: 'Matching Information',
  sequence_order: 'Sequence Order',
  drag_drop_order: 'Drag & Drop Order',
  image_labeling: 'Image Labeling',
  diagram_labeling: 'Diagram Labeling',
  map_labeling: 'Map Labeling',
  audio_response: 'Audio Response',
  coding: 'Coding',
  spreadsheet_task: 'Spreadsheet Task',
};

export function getDefaultOptions(type: CreateQuestionInput['type']) {
  if (type === 'true_false') {
    return [
      { content: 'True', isCorrect: true, sortOrder: 0 },
      { content: 'False', isCorrect: false, sortOrder: 1 },
    ];
  }

  if (type === 'yes_no') {
    return [
      { content: 'Yes', isCorrect: true, sortOrder: 0 },
      { content: 'No', isCorrect: false, sortOrder: 1 },
    ];
  }

  if (
    type === 'essay' ||
    type === 'paragraph_answer' ||
    type === 'file_upload' ||
    type === 'audio_response' ||
    type === 'coding' ||
    type === 'spreadsheet_task'
  ) {
    return [];
  }

  if (type === 'fill_blank' || type === 'short_answer') {
    return [{ content: '', isCorrect: true, sortOrder: 0 }];
  }

  if (
    MATCHING_TYPES.includes(type as (typeof MATCHING_TYPES)[number]) ||
    LABELING_TYPES.includes(type as (typeof LABELING_TYPES)[number]) ||
    ORDERING_TYPES.includes(type as (typeof ORDERING_TYPES)[number])
  ) {
    return [];
  }

  return [
    { content: '', isCorrect: false, sortOrder: 0 },
    { content: '', isCorrect: false, sortOrder: 1 },
  ];
}

export function getDefaultMatchingPairs() {
  return [
    { left: '', right: '' },
    { left: '', right: '' },
  ];
}

export function getDefaultOrderingItems() {
  return [{ content: '' }, { content: '' }, { content: '' }];
}

export function questionTagIds(question: Question): string[] {
  const tags = (question as Question & { tags?: Array<{ id: string }> }).tags;

  return tags?.map((tag) => tag.id) ?? [];
}

function extractMetadataFields(metadata: Record<string, unknown> | undefined) {
  return {
    allowCalculator: Boolean(metadata?.allowCalculator),
    timeLimitSeconds:
      typeof metadata?.timeLimitSeconds === 'number'
        ? metadata.timeLimitSeconds
        : undefined,
    mediaUrl:
      typeof metadata?.mediaUrl === 'string' ? metadata.mediaUrl : '',
    codeLanguage:
      typeof metadata?.codeLanguage === 'string' ? metadata.codeLanguage : '',
  };
}

function extractScoringFields(scoring: Record<string, unknown> | undefined) {
  const criteria = scoring?.criteria;

  if (Array.isArray(criteria) && criteria.length > 0) {
    return {
      scoringMode: 'rubric' as const,
      questionScore:
        typeof scoring?.maxScore === 'number' ? scoring.maxScore : 1,
      wrongScore: 0,
      rubricCriteria: criteria.map((item) => ({
        content: String(item),
      })),
    };
  }

  const wrongScore = scoring?.wrongScore;

  return {
    scoringMode:
      typeof wrongScore === 'number' && wrongScore !== 0
        ? ('negative' as const)
        : ('simple' as const),
    questionScore:
      typeof scoring?.score === 'number' ? scoring.score
      : typeof scoring?.correctScore === 'number' ? scoring.correctScore
      : 1,
    wrongScore: typeof wrongScore === 'number' ? wrongScore : 0,
    rubricCriteria: [{ content: '' }],
  };
}

export function buildQuestionMetadata(
  data: Pick<
    CreateQuestionInput,
    'allowCalculator' | 'timeLimitSeconds' | 'mediaUrl' | 'codeLanguage' | 'type'
  >,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (data.allowCalculator) {
    metadata.allowCalculator = true;
  }

  if (data.timeLimitSeconds != null && data.timeLimitSeconds > 0) {
    metadata.timeLimitSeconds = data.timeLimitSeconds;
  }

  if (
    isLabelingType(data.type) &&
    data.mediaUrl &&
    data.mediaUrl.trim().length > 0
  ) {
    metadata.mediaUrl = data.mediaUrl.trim();
  }

  if (data.type === 'coding' && data.codeLanguage?.trim()) {
    metadata.codeLanguage = data.codeLanguage.trim();
  }

  return metadata;
}

export function buildQuestionScoringSchema(
  data: Pick<
    CreateQuestionInput,
    'scoringMode' | 'questionScore' | 'wrongScore' | 'rubricCriteria'
  >,
): Record<string, unknown> {
  const score = data.questionScore ?? 1;

  if (data.scoringMode === 'rubric') {
    const criteria =
      data.rubricCriteria
        ?.map((item) => item.content.trim())
        .filter(Boolean) ?? [];

    return {
      criteria,
      maxScore: score,
    };
  }

  if (data.scoringMode === 'negative') {
    return {
      correctScore: score,
      wrongScore: data.wrongScore ?? 0,
    };
  }

  return { score };
}

export function questionToFormValues(
  question: Question,
  bankId: string,
): UpdateQuestionInput {
  const type = (question.question_type ??
    question.type ??
    'single_choice') as AssessmentQuestionType;
  const schema = (question.answer_schema ?? {}) as Record<string, unknown>;
  const metadata = extractMetadataFields(
    question.metadata as Record<string, unknown> | undefined,
  );
  const scoring = extractScoringFields(
    question.scoring_schema as Record<string, unknown> | undefined,
  );

  const base: UpdateQuestionInput = {
    id: question.id,
    bankId,
    type,
    content: question.content,
    explanation: question.explanation ?? '',
    difficulty: (question.difficulty ?? 'medium') as UpdateQuestionInput['difficulty'],
    tagIds: questionTagIds(question),
    questionGroupId: question.question_group_id ?? null,
    ...metadata,
    ...scoring,
  };

  if (
    MATCHING_TYPES.includes(type as (typeof MATCHING_TYPES)[number]) ||
    LABELING_TYPES.includes(type as (typeof LABELING_TYPES)[number])
  ) {
    const leftItems = (schema.leftItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const rightItems = (schema.rightItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const answers = (schema.answers ?? {}) as Record<string, string>;
    const rightById = Object.fromEntries(
      rightItems.map((item) => [item.id, item.content]),
    );

    return {
      ...base,
      matchingPairs: leftItems.map((left) => ({
        left: left.content,
        right: rightById[answers[left.id] ?? ''] ?? '',
      })),
    };
  }

  if (ORDERING_TYPES.includes(type as (typeof ORDERING_TYPES)[number])) {
    const items = (schema.items ?? []) as Array<{ id: string; content: string }>;
    const correctOrder = (schema.correctOrder ?? []) as string[];
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));

    return {
      ...base,
      orderingItems: correctOrder.map((id) => ({
        content: byId[id]?.content ?? '',
      })),
    };
  }

  if (question.options && question.options.length > 0) {
    return {
      ...base,
      options: question.options.map((option) => ({
        content: option.content,
        isCorrect: option.is_correct,
        sortOrder: option.sort_order,
      })),
    };
  }

  if (type === 'fill_blank' || type === 'short_answer') {
    const accepted = (schema.acceptedAnswers ?? []) as string[];

    return {
      ...base,
      options: accepted.map((answer, index) => ({
        content: answer,
        isCorrect: true,
        sortOrder: index,
      })),
    };
  }

  return {
    ...base,
    options: getDefaultOptions(type),
  };
}

export function isMatchingType(type: string) {
  return MATCHING_TYPES.includes(type as (typeof MATCHING_TYPES)[number]);
}

export function isLabelingType(type: string) {
  return LABELING_TYPES.includes(type as (typeof LABELING_TYPES)[number]);
}

export function isMatchingOrLabelingType(type: string) {
  return isMatchingType(type) || isLabelingType(type);
}

export function isOrderingType(type: string) {
  return ORDERING_TYPES.includes(type as (typeof ORDERING_TYPES)[number]);
}

export function isAcceptedAnswersType(type: string) {
  return type === 'fill_blank' || type === 'short_answer';
}

export function isFixedOptionType(type: string) {
  return type === 'true_false' || type === 'yes_no';
}

export function isOpenTextType(type: string) {
  return OPEN_TEXT_TYPES.includes(type as (typeof OPEN_TEXT_TYPES)[number]);
}

export function isFileUploadType(type: string) {
  return type === 'file_upload';
}

export function isAudioResponseType(type: string) {
  return type === 'audio_response';
}

export function isSpreadsheetTaskType(type: string) {
  return type === 'spreadsheet_task';
}

export function isOpenFileType(type: string) {
  return OPEN_FILE_TYPES.includes(type as (typeof OPEN_FILE_TYPES)[number]);
}

export function isCodingType(type: string) {
  return type === 'coding';
}

export function getUploadFileCategory(
  questionType: string,
): 'document' | 'audio' | 'spreadsheet' {
  if (questionType === 'audio_response') return 'audio';
  if (questionType === 'spreadsheet_task') return 'spreadsheet';

  return 'document';
}

export function getQuestionMediaUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const url = metadata?.mediaUrl;

  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}
