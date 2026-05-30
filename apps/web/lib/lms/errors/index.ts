export class LmsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LmsError';
  }
}

export const LMS_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export function isLmsError(error: unknown, code?: string): error is LmsError {
  if (!(error instanceof LmsError)) {
    return false;
  }

  if (code) {
    return error.code === code;
  }

  return true;
}
