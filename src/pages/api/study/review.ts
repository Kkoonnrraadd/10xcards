import type { APIRoute } from "astro";
import { submitReviewSchema } from "@/lib/validation/schemas";
import { StudyService } from "@/lib/services/study.service";
import { createErrorResponse, NotFoundError } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * POST /api/study/review
 *
 * Submits a review for a flashcard and updates FSRS parameters.
 *
 * This endpoint:
 * 1. Validates the flashcard exists and belongs to the user
 * 2. Calculates new FSRS parameters (stability, difficulty, due_date)
 * 3. Updates the review history
 * 4. Saves the updated flashcard
 *
 * Request body:
 * - flashcard_id: string (UUID)
 * - rating: 1 | 2 | 3 | 4
 *   - 1 = Again (complete failure)
 *   - 2 = Hard (difficult but recalled)
 *   - 3 = Good (recalled with some effort)
 *   - 4 = Easy (perfect recall)
 *
 * Response (200 OK):
 * {
 *   "id": "uuid",
 *   "user_id": "uuid",
 *   "front": "Question",
 *   "back": "Answer",
 *   "due_date": "2025-10-20T15:30:00Z",
 *   "stability": 2.3,
 *   "difficulty": 4.8,
 *   "review_history": [
 *     {
 *       "date": "2025-10-18T12:00:00Z",
 *       "rating": 3
 *     }
 *   ],
 *   "created_at": "2025-10-18T12:00:00Z",
 *   "updated_at": "2025-10-18T12:00:00Z"
 * }
 *
 * Error responses:
 * - 400: Invalid UUID or rating
 * - 401: Authentication required
 * - 404: Flashcard not found
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse and validate
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = submitReviewSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Submit review
  try {
    const studyService = new StudyService(locals.supabase);
    const flashcard = await studyService.submitReview(user.id, validation.data.flashcard_id, validation.data.rating);

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    console.error("Error submitting review:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to submit review", 500);
  }
};

