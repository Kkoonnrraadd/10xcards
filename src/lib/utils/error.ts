import type { ApiErrorCode, ApiErrorResponseDTO } from "@/types";

/**
 * Creates a standardized error response for API endpoints
 *
 * This function ensures all API errors follow a consistent format,
 * making it easier for clients to handle errors uniformly.
 *
 * @param code - Error code from ApiErrorCode enum
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details (e.g., validation errors)
 * @returns Response object with JSON error body
 *
 * @example
 * ```typescript
 * return createErrorResponse(
 *   "VALIDATION_ERROR",
 *   "Invalid input",
 *   400,
 *   validation.error.flatten()
 * );
 * ```
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: ApiErrorResponseDTO = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Custom error class for AI generation failures
 *
 * This error is thrown when the AI service fails to generate flashcards.
 * It includes an error ID that can be used to correlate with server logs.
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public errorId: string
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

/**
 * Custom error class for AI service timeouts
 *
 * This error is thrown when the AI service takes too long to respond
 * (exceeds the configured timeout).
 */
export class AITimeoutError extends Error {
  constructor(message = "AI service timeout") {
    super(message);
    this.name = "AITimeoutError";
  }
}

/**
 * Custom error class for resource not found scenarios
 *
 * This error is thrown when a requested resource (e.g., flashcard)
 * doesn't exist or the user doesn't have access to it.
 */
export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
