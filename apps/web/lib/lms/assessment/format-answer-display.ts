import type { AssessmentQuestionType } from './question-types';

export function formatStudentAnswerDisplay(
  questionType: string,
  answerData: Record<string, unknown>,
  options?: Array<{ key: string; content: string }>,
  answerSchema?: Record<string, unknown>,
): string {
  if (questionType === 'single_choice' || questionType === 'true_false') {
    const key = String(answerData.selected ?? answerData.value ?? '');

    if (!key) return '—';

    const match = options?.find((o) => o.key === key);

    return match?.content ?? key;
  }

  if (questionType === 'multiple_choice') {
    const keys = Array.isArray(answerData.selected) ?
        answerData.selected.map(String)
      : [];

    if (keys.length === 0) return '—';

    return keys
      .map((key) => options?.find((o) => o.key === key)?.content ?? key)
      .join(', ');
  }

  if (
    questionType === 'matching_pairs' ||
    questionType === 'matching_headings' ||
    questionType === 'matching_features' ||
    questionType === 'matching_information' ||
    questionType === 'image_labeling' ||
    questionType === 'diagram_labeling' ||
    questionType === 'map_labeling'
  ) {
    const pairs = (answerData.pairs ?? answerData.answers ?? {}) as Record<
      string,
      string
    >;
    const leftItems = (answerSchema?.leftItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const rightItems = (answerSchema?.rightItems ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const rightById = Object.fromEntries(
      rightItems.map((item) => [item.id, item.content]),
    );
    const entries = leftItems
      .map((left) => {
        const rightId = pairs[left.id];

        if (!rightId) return null;

        return `${left.content} → ${rightById[rightId] ?? rightId}`;
      })
      .filter(Boolean);

    return entries.length > 0 ? entries.join('; ') : '—';
  }

  if (questionType === 'sequence_order' || questionType === 'drag_drop_order') {
    const order = Array.isArray(answerData.order)
      ? answerData.order.map(String)
      : [];
    const items = (answerSchema?.items ?? []) as Array<{
      id: string;
      content: string;
    }>;
    const byId = Object.fromEntries(items.map((item) => [item.id, item.content]));

    if (order.length === 0) return '—';

    return order.map((id, index) => `${index + 1}. ${byId[id] ?? id}`).join(' → ');
  }

  const text = answerData.text ?? answerData.value;

  if (
    questionType === 'file_upload' ||
    questionType === 'audio_response' ||
    questionType === 'spreadsheet_task'
  ) {
    const fileName = answerData.fileName;

    return fileName ? String(fileName) : '—';
  }

  return text ? String(text) : '—';
}

export function formatCorrectAnswerDisplay(
  questionType: AssessmentQuestionType | string,
  answerSchema: Record<string, unknown>,
): string | null {
  switch (questionType) {
    case 'single_choice': {
      const key = answerSchema.correctAnswer as string | undefined;
      const options = answerSchema.options as
        | Array<{ key: string; content: string }>
        | undefined;

      if (!key) return null;

      return options?.find((o) => o.key === key)?.content ?? key;
    }

    case 'multiple_choice': {
      const keys = (answerSchema.correctAnswers as string[]) ?? [];
      const options = answerSchema.options as
        | Array<{ key: string; content: string }>
        | undefined;

      if (keys.length === 0) return null;

      return keys
        .map((key) => options?.find((o) => o.key === key)?.content ?? key)
        .join(', ');
    }

    case 'true_false':
    case 'yes_no':
      return String(answerSchema.correctAnswer ?? '').toUpperCase();

    case 'fill_blank':
    case 'short_answer': {
      const accepted = (answerSchema.acceptedAnswers as string[]) ?? [];

      return accepted.length > 0 ? accepted.join(' / ') : null;
    }

    case 'matching_pairs':
    case 'matching_headings':
    case 'matching_features':
    case 'matching_information':
    case 'image_labeling':
    case 'diagram_labeling':
    case 'map_labeling': {
      const leftItems = (answerSchema.leftItems ?? []) as Array<{
        id: string;
        content: string;
      }>;
      const rightItems = (answerSchema.rightItems ?? []) as Array<{
        id: string;
        content: string;
      }>;
      const answers = (answerSchema.answers ?? {}) as Record<string, string>;
      const rightById = Object.fromEntries(
        rightItems.map((item) => [item.id, item.content]),
      );

      return leftItems
        .map((left) => `${left.content} → ${rightById[answers[left.id] ?? ''] ?? '—'}`)
        .join('; ');
    }

    case 'sequence_order':
    case 'drag_drop_order': {
      const items = (answerSchema.items ?? []) as Array<{
        id: string;
        content: string;
      }>;
      const correctOrder = (answerSchema.correctOrder ?? []) as string[];
      const byId = Object.fromEntries(items.map((item) => [item.id, item.content]));

      return correctOrder
        .map((id, index) => `${index + 1}. ${byId[id] ?? id}`)
        .join(' → ');
    }

    default:
      return null;
  }
}

export function sanitizeAnswerSchemaForTaking(
  answerSchema: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!answerSchema) return {};

  if (Array.isArray(answerSchema.leftItems) && Array.isArray(answerSchema.rightItems)) {
    return {
      leftItems: answerSchema.leftItems,
      rightItems: answerSchema.rightItems,
    };
  }

  if (Array.isArray(answerSchema.items)) {
    return {
      items: answerSchema.items,
    };
  }

  const options = answerSchema.options;

  if (Array.isArray(options)) {
    return {
      options: options.map((opt) => ({
        key: String((opt as { key: string }).key),
        content: String((opt as { content: string }).content),
      })),
    };
  }

  return {};
}
