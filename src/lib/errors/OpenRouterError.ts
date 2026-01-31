/**
 * Custom error class for OpenRouter API errors
 * Provides structured error information including HTTP status codes and API error details
 */
export class OpenRouterError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails: unknown;

  constructor(message: string, statusCode: number, errorDetails?: unknown) {
    super(message);
    this.name = "OpenRouterError";
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
  }
}
