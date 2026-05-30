import type { AssessmentQuestionType } from './question-types';
import { getDefaultGradingMode } from './question-types';

export interface QuestionOptionInput {
  content: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface SimpleScoringSchema {
  score: number;
}

export interface WeightedScoringSchema {
  correctScore: number;
  wrongScore: number;
}

export interface NegativeScoringSchema {
  correctScore: number;
  wrongScore: number;
}

export interface RubricScoringSchema {
  criteria: string[];
  maxScore?: number;
}

export type ScoringSchema =
  | SimpleScoringSchema
  | WeightedScoringSchema
  | NegativeScoringSchema
  | RubricScoringSchema;

export interface SingleChoiceAnswerSchema {
  correctAnswer: string;
  options?: Array<{ key: string; content: string }>;
}

export interface MultipleChoiceAnswerSchema {
  correctAnswers: string[];
  options?: Array<{ key: string; content: string }>;
}

export interface TrueFalseAnswerSchema {
  correctAnswer: 'true' | 'false' | 'yes' | 'no';
}

export interface TextAnswerSchema {
  acceptedAnswers: string[];
  caseSensitive?: boolean;
}

export interface MatchingAnswerSchema {
  answers: Record<string, string>;
  leftItems?: Array<{ id: string; content: string }>;
  rightItems?: Array<{ id: string; content: string }>;
}

export interface OrderingAnswerSchema {
  items: Array<{ id: string; content: string }>;
  correctOrder: string[];
}

export type AnswerSchema =
  | SingleChoiceAnswerSchema
  | MultipleChoiceAnswerSchema
  | TrueFalseAnswerSchema
  | TextAnswerSchema
  | MatchingAnswerSchema
  | OrderingAnswerSchema
  | Record<string, unknown>;

export interface MatchingPairInput {
  left: string;
  right: string;
}

export interface OrderingItemInput {
  content: string;
}

export function buildMatchingSchema(
  pairs: MatchingPairInput[],
): MatchingAnswerSchema {
  const leftItems = pairs.map((pair, index) => ({
    id: `L${index + 1}`,
    content: pair.left.trim(),
  }));
  const rightItems = pairs.map((pair, index) => ({
    id: `R${index + 1}`,
    content: pair.right.trim(),
  }));
  const answers = Object.fromEntries(
    leftItems.map((left, index) => [left.id, rightItems[index]?.id ?? '']),
  );

  return { leftItems, rightItems, answers };
}

export function buildOrderingSchema(
  items: OrderingItemInput[],
): OrderingAnswerSchema {
  const keyed = items.map((item, index) => ({
    id: String(index + 1),
    content: item.content.trim(),
  }));

  return {
    items: keyed,
    correctOrder: keyed.map((item) => item.id),
  };
}

export function buildAnswerSchemaFromOptions(
  questionType: AssessmentQuestionType,
  options: QuestionOptionInput[],
): AnswerSchema {
  const sorted = [...options].sort((a, b) => a.sortOrder - b.sortOrder);
  const keyed = sorted.map((opt, index) => ({
    key: String.fromCharCode(65 + index),
    content: opt.content,
    isCorrect: opt.isCorrect,
  }));

  switch (questionType) {
    case 'single_choice': {
      const correct = keyed.find((o) => o.isCorrect);

      return {
        correctAnswer: correct?.key ?? 'A',
        options: keyed.map(({ key, content }) => ({ key, content })),
      };
    }

    case 'multiple_choice':
      return {
        correctAnswers: keyed.filter((o) => o.isCorrect).map((o) => o.key),
        options: keyed.map(({ key, content }) => ({ key, content })),
      };

    case 'true_false':
    case 'yes_no': {
      const correctOpt = sorted.find((o) => o.isCorrect);
      const content = correctOpt?.content.toLowerCase() ?? 'true';
      const isAffirmative = ['true', 'yes', 'đúng', 'có'].includes(content);

      return {
        correctAnswer:
          questionType === 'yes_no'
            ? isAffirmative
              ? 'yes'
              : 'no'
            : isAffirmative
              ? 'true'
              : 'false',
      };
    }

    case 'fill_blank':
    case 'short_answer':
      return {
        acceptedAnswers: sorted
          .filter((o) => o.isCorrect)
          .map((o) => o.content.trim()),
        caseSensitive: false,
      };

    default:
      return {};
  }
}

export function defaultScoringSchema(
  questionType: AssessmentQuestionType,
): ScoringSchema {
  const mode = getDefaultGradingMode(questionType);

  if (mode === 'manual') {
    return { score: 1 };
  }

  return { score: 1 };
}

export function normalizeText(value: string, caseSensitive = false): string {
  const trimmed = value.trim();

  return caseSensitive ? trimmed : trimmed.toLowerCase();
}
