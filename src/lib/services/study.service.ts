import type { SupabaseClient } from "@/db/supabase.client";
import type { FlashcardDTO, DueFlashcardsResponseDTO, ReviewRating, ReviewHistory } from "@/types";
import { NotFoundError } from "@/lib/utils/error";

// NOTE: Uncomment when ts-fsrs is installed
// import { FSRS, Rating, Card, RecordLog } from "ts-fsrs";

/**
 * Service for managing study sessions and spaced repetition
 *
 * This service handles the study workflow, including fetching due flashcards
 * and processing reviews using the FSRS (Free Spaced Repetition Scheduler) algorithm.
 *
 * IMPORTANT: This service requires the 'ts-fsrs' package to be installed.
 * Install it with: npm install ts-fsrs
 */
export class StudyService {
  // private fsrs: FSRS; // Uncomment when ts-fsrs is installed

  constructor(private supabase: SupabaseClient) {
    // this.fsrs = new FSRS(); // Uncomment when ts-fsrs is installed
  }

  /**
   * Gets flashcards that are due for review
   *
   * Returns flashcards where due_date <= now(), ordered by due_date (oldest first).
   * Also returns the total count of due flashcards.
   *
   * @param userId - ID of the user
   * @param limit - Maximum number of flashcards to return (1-100)
   * @returns List of due flashcards and total count
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const result = await studyService.getDueFlashcards(user.id, 20);
   * console.log(`You have ${result.total_due} cards to review`);
   * ```
   */
  async getDueFlashcards(userId: string, limit: number): Promise<DueFlashcardsResponseDTO> {
    const now = new Date().toISOString();

    // Get due flashcards with limit
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .lte("due_date", now)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Failed to get due flashcards:", error);
      throw new Error(`Failed to get due flashcards: ${error.message}`);
    }

    // Get total count of due flashcards (without limit)
    const { count, error: countError } = await this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("due_date", now);

    if (countError) {
      console.error("Failed to count due flashcards:", countError);
      throw new Error(`Failed to count due flashcards: ${countError.message}`);
    }

    return {
      data: data || [],
      total_due: count || 0,
    };
  }

  /**
   * Submits a review for a flashcard and updates FSRS parameters
   *
   * This method:
   * 1. Fetches the flashcard
   * 2. Calculates new FSRS parameters (stability, difficulty, due_date)
   * 3. Updates the review history
   * 4. Saves the updated flashcard
   *
   * @param userId - ID of the user
   * @param flashcardId - ID of the flashcard being reviewed
   * @param rating - Review rating (1=Again, 2=Hard, 3=Good, 4=Easy)
   * @returns Updated flashcard
   * @throws NotFoundError if flashcard not found
   * @throws Error if database operation fails
   *
   * @example
   * ```typescript
   * const flashcard = await studyService.submitReview(
   *   user.id,
   *   flashcardId,
   *   3 // Good
   * );
   * ```
   */
  async submitReview(userId: string, flashcardId: string, rating: ReviewRating): Promise<FlashcardDTO> {
    // 1. Get the flashcard
    const { data: flashcard, error: fetchError } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !flashcard) {
      throw new NotFoundError("Flashcard not found");
    }

    // 2. Calculate new FSRS parameters
    const fsrsParams = this.calculateFSRSParameters(flashcard, rating);

    // 3. Update review history
    const updatedHistory = this.updateReviewHistory(flashcard.review_history, rating);

    // 4. Save updated flashcard
    const { data: updatedFlashcard, error: updateError } = await this.supabase
      .from("flashcards")
      .update({
        stability: fsrsParams.stability,
        difficulty: fsrsParams.difficulty,
        due_date: fsrsParams.due_date,
        review_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update flashcard after review:", updateError);
      throw new Error(`Failed to update flashcard: ${updateError.message}`);
    }

    return updatedFlashcard;
  }

  /**
   * Calculates new FSRS parameters based on the review
   *
   * NOTE: This is a MOCK implementation. When ts-fsrs is installed,
   * this will use the real FSRS algorithm.
   *
   * @param flashcard - Current flashcard state
   * @param rating - Review rating (1-4)
   * @returns New FSRS parameters
   */
  private calculateFSRSParameters(
    flashcard: FlashcardDTO,
    rating: ReviewRating
  ): {
    stability: number;
    difficulty: number;
    due_date: string;
  } {
    // TODO: Replace with real FSRS implementation when ts-fsrs is installed
    /*
    // Real implementation (uncomment when ts-fsrs is installed):
    
    const card: Card = {
      stability: flashcard.stability || undefined,
      difficulty: flashcard.difficulty || undefined,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: flashcard.review_history?.length || 0,
      lapses: 0,
      state: flashcard.stability ? 2 : 0, // 0=New, 2=Review
      last_review: flashcard.updated_at ? new Date(flashcard.updated_at) : undefined,
    };

    // Map rating from 1-4 to FSRS Rating enum (1=Again, 2=Hard, 3=Good, 4=Easy)
    const fsrsRating = rating as Rating;

    const now = new Date();
    const schedulingCards = this.fsrs.repeat(card, now);
    
    // Get the card for the selected rating
    const selectedCard = schedulingCards[fsrsRating];
    
    return {
      stability: selectedCard.card.stability,
      difficulty: selectedCard.card.difficulty,
      due_date: selectedCard.card.due.toISOString(),
    };
    */

    // MOCK implementation for development
    const currentStability = flashcard.stability || 1;
    const currentDifficulty = flashcard.difficulty || 5;

    // Simple mock algorithm
    let newStability = currentStability;
    let newDifficulty = currentDifficulty;
    let intervalDays = 1;

    switch (rating) {
      case 1: // Again
        newStability = Math.max(1, currentStability * 0.5);
        newDifficulty = Math.min(10, currentDifficulty + 1);
        intervalDays = 1;
        break;
      case 2: // Hard
        newStability = currentStability * 1.2;
        newDifficulty = Math.min(10, currentDifficulty + 0.5);
        intervalDays = Math.ceil(currentStability * 1.2);
        break;
      case 3: // Good
        newStability = currentStability * 2.5;
        newDifficulty = Math.max(1, currentDifficulty - 0.3);
        intervalDays = Math.ceil(currentStability * 2.5);
        break;
      case 4: // Easy
        newStability = currentStability * 4;
        newDifficulty = Math.max(1, currentDifficulty - 0.5);
        intervalDays = Math.ceil(currentStability * 4);
        break;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + intervalDays);

    return {
      stability: newStability,
      difficulty: newDifficulty,
      due_date: dueDate.toISOString(),
    };
  }

  /**
   * Updates the review history with a new review entry
   *
   * @param currentHistory - Current review history (or null for new cards)
   * @param rating - Review rating
   * @returns Updated review history
   */
  private updateReviewHistory(currentHistory: ReviewHistory | null, rating: ReviewRating): ReviewHistory {
    const newEntry = {
      date: new Date().toISOString(),
      rating,
    };

    if (!currentHistory) {
      return [newEntry];
    }

    return [...currentHistory, newEntry];
  }
}

