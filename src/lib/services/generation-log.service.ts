import type { SupabaseClient } from "@/db/supabase.client";
import type { GenerationLogDTO, CreateGenerationLogRequestDTO } from "@/types";

/**
 * Service for managing generation logs
 *
 * This service tracks user interactions with AI-generated flashcard candidates.
 * It records whether candidates were accepted, edited, or rejected, which helps
 * improve the AI generation quality over time.
 */
export class GenerationLogService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a log entry for a rejected flashcard candidate
   *
   * This is called when a user explicitly rejects an AI-generated candidate
   * without creating a flashcard from it.
   *
   * @param userId - ID of the user
   * @param data - Rejection log data (status, original_front, original_back)
   * @returns Created generation log entry
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const log = await logService.createRejectionLog(user.id, {
   *   status: "rejected",
   *   original_front: "What is X?",
   *   original_back: "X is..."
   * });
   * ```
   */
  async createRejectionLog(
    userId: string,
    data: CreateGenerationLogRequestDTO
  ): Promise<GenerationLogDTO> {
    const { error, data: log } = await this.supabase
      .from("generation_logs")
      .insert({
        user_id: userId,
        flashcard_id: null,
        status: data.status,
        original_front: data.original_front,
        original_back: data.original_back,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create rejection log: ${error.message}`);
    }

    return log;
  }

  /**
   * Creates a log entry for an accepted flashcard candidate
   *
   * This is called when a user creates a flashcard from an AI-generated candidate.
   * It automatically determines if the candidate was accepted as-is or edited
   * before acceptance.
   *
   * @param userId - ID of the user
   * @param flashcardId - ID of the created flashcard
   * @param originalFront - Original front text from AI
   * @param originalBack - Original back text from AI
   * @param currentFront - Current front text (after potential editing)
   * @param currentBack - Current back text (after potential editing)
   * @returns Created generation log entry
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const log = await logService.createAcceptanceLog(
   *   user.id,
   *   flashcard.id,
   *   "Original question",
   *   "Original answer",
   *   "Edited question",
   *   "Edited answer"
   * );
   * ```
   */
  async createAcceptanceLog(
    userId: string,
    flashcardId: string,
    originalFront: string,
    originalBack: string,
    currentFront: string,
    currentBack: string
  ): Promise<GenerationLogDTO> {
    // Determine if the candidate was edited
    const status = this.determineStatus(originalFront, originalBack, currentFront, currentBack);

    const { error, data: log } = await this.supabase
      .from("generation_logs")
      .insert({
        user_id: userId,
        flashcard_id: flashcardId,
        status,
        original_front: originalFront,
        original_back: originalBack,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create acceptance log: ${error.message}`);
    }

    return log;
  }

  /**
   * Determines the status based on content comparison
   *
   * Compares the original AI-generated content with the current content
   * to determine if the user accepted it as-is or made edits.
   *
   * @param originalFront - Original front text
   * @param originalBack - Original back text
   * @param currentFront - Current front text
   * @param currentBack - Current back text
   * @returns 'accepted' if unchanged, 'accepted_with_edit' if modified
   */
  private determineStatus(
    originalFront: string,
    originalBack: string,
    currentFront: string,
    currentBack: string
  ): "accepted" | "accepted_with_edit" {
    const frontUnchanged = originalFront === currentFront;
    const backUnchanged = originalBack === currentBack;

    return frontUnchanged && backUnchanged ? "accepted" : "accepted_with_edit";
  }
}

