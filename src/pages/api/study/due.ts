import type { APIRoute } from "astro";
import { getDueFlashcardsSchema } from "@/lib/validation/schemas";
import { StudyService } from "@/lib/services/study.service";
import { createErrorResponse } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * GET /api/study/due
 *
 * Gets flashcards that are due for review.
 *
 * Returns flashcards where due_date <= now(), ordered by due_date (oldest first).
 * Also returns the total count of due flashcards (without limit).
 *
 * Query parameters:
 * - limit?: number (default: 20, max: 100)
 *
 * Response (200 OK):
 * {
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "user_id": "uuid",
 *       "front": "Question",
 *       "back": "Answer",
 *       "due_date": "2025-10-18T12:00:00Z",
 *       "stability": 1.5,
 *       "difficulty": 5.2,
 *       "review_history": [...],
 *       "created_at": "2025-10-18T12:00:00Z",
 *       "updated_at": "2025-10-18T12:00:00Z"
 *     }
 *   ],
 *   "total_due": 45
 * }
 *
 * Error responses:
 * - 400: Invalid limit parameter
 * - 401: Authentication required
 */
export const GET: APIRoute = async ({ url, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse query params
  const query = {
    limit: url.searchParams.get("limit"),
  };

  // 3. Validate
  const validation = getDueFlashcardsSchema.safeParse(query);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, validation.error.flatten());
  }

  // 4. Get due flashcards
  try {
    const studyService = new StudyService(locals.supabase);
    const result = await studyService.getDueFlashcards(user.id, validation.data.limit);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting due flashcards:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to get due flashcards", 500);
  }
};
