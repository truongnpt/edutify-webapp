import type { AssessmentQuestionType } from './question-types';
import { supportsAutoGrading } from './question-types';
import type {
  MatchingAnswerSchema,
  MultipleChoiceAnswerSchema,
  OrderingAnswerSchema,
  ScoringSchema,
  SingleChoiceAnswerSchema,
  TextAnswerSchema,
  TrueFalseAnswerSchema,
} from './answer-schema';
import { normalizeText } from './answer-schema';

export interface GradingInput {
  questionType: AssessmentQuestionType;
  answerSchema: Record<string, unknown>;
  scoringSchema: ScoringSchema;
  studentAnswer: Record<string, unknown>;
}

export interface GradingResult {
  isCorrect: boolean | null;
  score: number;
  maxScore: number;
  requiresManualReview: boolean;
  feedback?: string;
}

function resolveMaxScore(scoring: ScoringSchema): number {
  if ('score' in scoring && typeof scoring.score === 'number') {
    return scoring.score;
  }

  if ('correctScore' in scoring && typeof scoring.correctScore === 'number') {
    return scoring.correctScore;
  }

  if ('maxScore' in scoring && typeof scoring.maxScore === 'number') {
    return scoring.maxScore;
  }

  return 1;
}

function gradeSingleChoice(
  schema: SingleChoiceAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const selected = String(studentAnswer.selected ?? studentAnswer.value ?? '');
  const isCorrect = selected === schema.correctAnswer;

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

function gradeMultipleChoice(
  schema: MultipleChoiceAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const selected = new Set(
    Array.isArray(studentAnswer.selected)
      ? studentAnswer.selected.map(String)
      : [],
  );
  const correct = new Set(schema.correctAnswers);
  const isCorrect =
    selected.size === correct.size &&
    [...correct].every((key) => selected.has(key));

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

function gradeTrueFalse(
  schema: TrueFalseAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const raw = String(studentAnswer.value ?? studentAnswer.selected ?? '')
    .toLowerCase()
    .trim();
  const isCorrect = raw === schema.correctAnswer;

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

function gradeTextAnswer(
  schema: TextAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const raw = String(studentAnswer.text ?? studentAnswer.value ?? '');
  const normalized = normalizeText(raw, schema.caseSensitive ?? false);
  const accepted = (schema.acceptedAnswers ?? []).map((a) =>
    normalizeText(a, schema.caseSensitive ?? false),
  );
  const isCorrect = accepted.includes(normalized);

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

function gradeMatching(
  schema: MatchingAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const pairs = (studentAnswer.pairs ?? studentAnswer.answers ?? {}) as Record<
    string,
    string
  >;
  const expected = schema.answers ?? {};
  const keys = Object.keys(expected);
  const isCorrect =
    keys.length > 0 && keys.every((key) => pairs[key] === expected[key]);

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

function gradeOrdering(
  schema: OrderingAnswerSchema,
  studentAnswer: Record<string, unknown>,
  maxScore: number,
  wrongScore: number,
): GradingResult {
  const correctOrder = schema.correctOrder ?? [];
  const studentOrder = Array.isArray(studentAnswer.order)
    ? studentAnswer.order.map(String)
    : [];
  const isCorrect =
    correctOrder.length > 0 &&
    correctOrder.length === studentOrder.length &&
    correctOrder.every((id, index) => id === studentOrder[index]);

  return {
    isCorrect,
    score: isCorrect ? maxScore : wrongScore,
    maxScore,
    requiresManualReview: false,
  };
}

/**
 * Domain-agnostic auto-grader.
 * Manual / AI / hybrid types return requiresManualReview = true.
 */
export function gradeAnswer(input: GradingInput): GradingResult {
  const { questionType, answerSchema, scoringSchema, studentAnswer } = input;

  if (!supportsAutoGrading(questionType)) {
    return {
      isCorrect: null,
      score: 0,
      maxScore: resolveMaxScore(scoringSchema),
      requiresManualReview: true,
    };
  }

  const maxScore = resolveMaxScore(scoringSchema);
  const wrongScore =
    'wrongScore' in scoringSchema && typeof scoringSchema.wrongScore === 'number'
      ? scoringSchema.wrongScore
      : 0;

  switch (questionType) {
    case 'single_choice':
      return gradeSingleChoice(
      answerSchema as unknown as SingleChoiceAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'multiple_choice':
      return gradeMultipleChoice(
      answerSchema as unknown as MultipleChoiceAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'true_false':
    case 'yes_no':
      return gradeTrueFalse(
      answerSchema as unknown as TrueFalseAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'fill_blank':
    case 'short_answer':
      return gradeTextAnswer(
      answerSchema as unknown as TextAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'matching_pairs':
    case 'matching_headings':
    case 'matching_features':
    case 'matching_information':
      return gradeMatching(
      answerSchema as unknown as MatchingAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'sequence_order':
    case 'drag_drop_order':
      return gradeOrdering(
      answerSchema as unknown as OrderingAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    case 'image_labeling':
    case 'diagram_labeling':
    case 'map_labeling':
      return gradeMatching(
      answerSchema as unknown as MatchingAnswerSchema,
        studentAnswer,
        maxScore,
        wrongScore,
      );

    default:
      return {
        isCorrect: null,
        score: 0,
        maxScore,
        requiresManualReview: true,
        feedback: `Auto-grading not yet implemented for ${questionType}`,
      };
  }
}

export function gradeAttemptAnswers(
  items: GradingInput[],
): { totalScore: number; maxScore: number; results: GradingResult[] } {
  const results = items.map(gradeAnswer);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);

  return { totalScore, maxScore, results };
}
