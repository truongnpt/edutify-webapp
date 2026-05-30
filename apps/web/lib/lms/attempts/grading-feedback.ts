export interface RubricCriterionScore {
  index: number;
  score: number;
}

export interface GradingFeedbackPayload {
  comment?: string;
  rubricScores?: RubricCriterionScore[];
}

export function serializeGradingFeedback(
  comment?: string,
  rubricScores?: RubricCriterionScore[],
): string | null {
  const trimmed = comment?.trim();

  if (!trimmed && (!rubricScores || rubricScores.length === 0)) {
    return null;
  }

  return JSON.stringify({
    comment: trimmed ?? '',
    rubricScores: rubricScores ?? [],
  });
}

export function parseGradingFeedback(
  feedback: string | null | undefined,
): GradingFeedbackPayload {
  if (!feedback) {
    return {};
  }

  try {
    const parsed = JSON.parse(feedback) as unknown;

    if (
      parsed &&
      typeof parsed === 'object' &&
      ('rubricScores' in parsed || 'comment' in parsed)
    ) {
      const payload = parsed as GradingFeedbackPayload;

      return {
        comment: typeof payload.comment === 'string' ? payload.comment : '',
        rubricScores: Array.isArray(payload.rubricScores)
          ? payload.rubricScores.filter(
              (item): item is RubricCriterionScore =>
                typeof item === 'object' &&
                item != null &&
                typeof (item as RubricCriterionScore).index === 'number' &&
                typeof (item as RubricCriterionScore).score === 'number',
            )
          : undefined,
      };
    }
  } catch {
    // Plain text feedback from before structured storage
  }

  return { comment: feedback };
}

export function getRubricCriteria(
  scoringSchema: Record<string, unknown> | null | undefined,
): string[] {
  const criteria = scoringSchema?.criteria;

  if (!Array.isArray(criteria)) {
    return [];
  }

  return criteria.map((item) => String(item)).filter(Boolean);
}

export function criterionMaxScore(
  totalMaxScore: number,
  criteriaCount: number,
): number {
  if (criteriaCount <= 0) {
    return totalMaxScore;
  }

  return totalMaxScore / criteriaCount;
}
