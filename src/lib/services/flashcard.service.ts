import type { SupabaseClient } from "@/db/supabase.client";
import type {
  FlashcardDTO,
  CreateFlashcardRequestDTO,
  UpdateFlashcardRequestDTO,
  ListFlashcardsQueryDTO,
  ListFlashcardsResponseDTO,
} from "@/types";
import { GenerationLogService } from "./generation-log.service";

/**
 * Service for managing flashcards
 *
 * This service handles all CRUD operations for flashcards, including
 * creation, listing, updating, and deletion. It also integrates with
 * the GenerationLogService to track AI-generated flashcards.
 */
export class FlashcardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new flashcard
   *
   * If generation_metadata is provided, it also creates a generation log
   * entry to track whether the AI-generated candidate was accepted as-is
   * or edited before acceptance.
   *
   * @param userId - ID of the user creating the flashcard
   * @param data - Flashcard data (front, back, optional generation_metadata)
   * @returns Created flashcard
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * // Manual creation
   * const flashcard = await service.createFlashcard(user.id, {
   *   front: "What is X?",
   *   back: "X is..."
   * });
   *
   * // From AI-generated candidate
   * const flashcard = await service.createFlashcard(user.id, {
   *   front: "Edited question",
   *   back: "Edited answer",
   *   generation_metadata: {
   *     original_front: "Original question",
   *     original_back: "Original answer"
   *   }
   * });
   * ```
   */
  async createFlashcard(userId: string, data: CreateFlashcardRequestDTO): Promise<FlashcardDTO> {
    // Create flashcard with initial FSRS parameters
    const { error, data: flashcard } = await this.supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        front: data.front,
        back: data.back,
        due_date: new Date().toISOString(), // Due immediately for new cards
        stability: null, // Will be set after first review
        difficulty: null, // Will be set after first review
        review_history: null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    // If this was from an AI-generated candidate, create generation log
    if (data.generation_metadata) {
      const logService = new GenerationLogService(this.supabase);
      await logService.createAcceptanceLog(
        userId,
        flashcard.id,
        data.generation_metadata.original_front,
        data.generation_metadata.original_back,
        data.front,
        data.back
      );
    }

    return flashcard;
  }

  /**
   * Lists flashcards with pagination and optional search
   *
   * @param userId - ID of the user
   * @param query - Query parameters (page, limit, search)
   * @returns Paginated list of flashcards
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const result = await service.listFlashcards(user.id, {
   *   page: 1,
   *   limit: 20,
   *   search: "quantum"
   * });
   * ```
   */
  async listFlashcards(userId: string, query: ListFlashcardsQueryDTO): Promise<ListFlashcardsResponseDTO> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = this.supabase
      .from("flashcards")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Add search filter if provided
    if (query.search) {
      queryBuilder = queryBuilder.or(`front.ilike.%${query.search}%,back.ilike.%${query.search}%`);
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to list flashcards: ${error.message}`);
    }

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  /**
   * Gets a single flashcard by ID
   *
   * @param userId - ID of the user
   * @param flashcardId - ID of the flashcard
   * @returns Flashcard or null if not found
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const flashcard = await service.getFlashcard(user.id, flashcardId);
   * if (!flashcard) {
   *   return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
   * }
   * ```
   */
  async getFlashcard(userId: string, flashcardId: string): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Updates a flashcard
   *
   * Only the front and back content can be updated. FSRS parameters
   * are managed by the StudyService during reviews.
   *
   * @param userId - ID of the user
   * @param flashcardId - ID of the flashcard
   * @param data - Data to update (front and/or back)
   * @returns Updated flashcard or null if not found
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const flashcard = await service.updateFlashcard(user.id, flashcardId, {
   *   front: "Updated question"
   * });
   * ```
   */
  async updateFlashcard(
    userId: string,
    flashcardId: string,
    data: UpdateFlashcardRequestDTO
  ): Promise<FlashcardDTO | null> {
    const { data: flashcard, error } = await this.supabase
      .from("flashcards")
      .update({
        front: data.front,
        back: data.back,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    return flashcard;
  }

  /**
   * Deletes a flashcard
   *
   * @param userId - ID of the user
   * @param flashcardId - ID of the flashcard
   * @returns true if deleted, false if not found
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const deleted = await service.deleteFlashcard(user.id, flashcardId);
   * if (!deleted) {
   *   return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
   * }
   * ```
   */
  async deleteFlashcard(userId: string, flashcardId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("flashcards")
      .delete({ count: "exact" })
      .eq("id", flashcardId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }

    return (count || 0) > 0;
  }
}

