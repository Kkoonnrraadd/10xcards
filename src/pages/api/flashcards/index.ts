import type { APIRoute } from "astro";
import { createFlashcardSchema, listFlashcardsSchema } from "@/lib/validation/schemas";
import { FlashcardService } from "@/lib/services/flashcard.service";
import { createErrorResponse } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * POST /api/flashcards
 *
 * Creates a new flashcard (manually or from AI-generated candidate).
 *
 * Request body:
 * - front: string (max 200 chars)
 * - back: string (max 500 chars)
 * - generation_metadata?: { original_front: string, original_back: string }
 *
 * Response (201 Created):
 * {
 *   "id": "uuid",
 *   "user_id": "uuid",
 *   "front": "Question",
 *   "back": "Answer",
 *   "due_date": "2025-10-18T12:00:00Z",
 *   "stability": null,
 *   "difficulty": null,
 *   "review_history": null,
 *   "created_at": "2025-10-18T12:00:00Z",
 *   "updated_at": "2025-10-18T12:00:00Z"
 * }
 *
 * Error responses:
 * - 400: Invalid input
 * - 401: Authentication required
 * - 429: Rate limit exceeded (handled by middleware)
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

  const validation = createFlashcardSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Create flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.createFlashcard(user.id, validation.data);

    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating flashcard:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to create flashcard", 500);
  }
};

/**
 * GET /api/flashcards
 *
 * Lists flashcards with pagination and optional search.
 *
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 20, max: 100)
 * - search?: string
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
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 150,
 *     "pages": 8
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid query parameters
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
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    search: url.searchParams.get("search") || undefined,
  };

  // 3. Validate
  const validation = listFlashcardsSchema.safeParse(query);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, validation.error.flatten());
  }

  // 4. List flashcards
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const result = await flashcardService.listFlashcards(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing flashcards:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to list flashcards", 500);
  }
};
