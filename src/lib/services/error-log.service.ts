import crypto from "crypto";
import type { SupabaseClient } from "@/db/supabase.client";
import type { GenerationErrorLogDTO } from "@/types";

/**
 * Service for logging AI generation errors
 *
 * This service is responsible for tracking errors that occur during
 * AI flashcard generation. It stores error details and hashes of
 * source text for debugging purposes.
 */
export class ErrorLogService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Logs an AI generation error to the database
   *
   * @param userId - ID of the user who experienced the error
   * @param model - Name of the AI model that failed
   * @param sourceText - Source text that was being processed
   * @param errorCode - Error code from the AI service
   * @param errorMessage - Human-readable error message
   * @returns ID of the created error log entry
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const errorId = await errorLogService.logGenerationError(
   *   user.id,
   *   "openai/gpt-4",
   *   sourceText,
   *   "TIMEOUT",
   *   "Request timed out after 60s"
   * );
   * ```
   */
  async logGenerationError(
    userId: string,
    model: string,
    sourceText: string,
    errorCode: string,
    errorMessage: string
  ): Promise<string> {
    const sourceTextHash = this.hashSourceText(sourceText);

    const { data, error } = await this.supabase
      .from("generation_error_logs")
      .insert({
        user_id: userId,
        model,
        source_text_hash: sourceTextHash,
        source_text_length: sourceText.length,
        error_code: errorCode,
        error_message: errorMessage,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log generation error: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Creates a SHA-256 hash of the source text
   *
   * This is used to identify duplicate errors without storing
   * the full source text (which could be large and contain sensitive data).
   *
   * @param text - Text to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private hashSourceText(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }
}

