import type { APIRoute } from "astro";
import { uuidSchema, updateFlashcardSchema } from "@/lib/validation/schemas";
import { FlashcardService } from "@/lib/services/flashcard.service";
import { createErrorResponse } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * GET /api/flashcards/:id
 *
 * Gets a single flashcard by ID.
 *
 * Response (200 OK):
 * {
 *   "id": "uuid",
 *   "user_id": "uuid",
 *   "front": "Question",
 *   "back": "Answer",
 *   "due_date": "2025-10-18T12:00:00Z",
 *   "stability": 1.5,
 *   "difficulty": 5.2,
 *   "review_history": [...],
 *   "created_at": "2025-10-18T12:00:00Z",
 *   "updated_at": "2025-10-18T12:00:00Z"
 * }
 *
 * Error responses:
 * - 400: Invalid UUID format
 * - 401: Authentication required
 * - 404: Flashcard not found
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Get flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.getFlashcard(user.id, idValidation.data);

    if (!flashcard) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting flashcard:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to get flashcard", 500);
  }
};

/**
 * PATCH /api/flashcards/:id
 *
 * Updates a flashcard (front and/or back content).
 *
 * Request body:
 * - front?: string (max 200 chars)
 * - back?: string (max 500 chars)
 *
 * Response (200 OK):
 * {
 *   "id": "uuid",
 *   "user_id": "uuid",
 *   "front": "Updated question",
 *   "back": "Updated answer",
 *   "due_date": "2025-10-18T12:00:00Z",
 *   "stability": 1.5,
 *   "difficulty": 5.2,
 *   "review_history": [...],
 *   "created_at": "2025-10-18T12:00:00Z",
 *   "updated_at": "2025-10-18T12:30:00Z"
 * }
 *
 * Error responses:
 * - 400: Invalid UUID or input data
 * - 401: Authentication required
 * - 404: Flashcard not found
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = updateFlashcardSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 4. Update flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.updateFlashcard(user.id, idValidation.data, validation.data);

    if (!flashcard) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating flashcard:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to update flashcard", 500);
  }
};

/**
 * DELETE /api/flashcards/:id
 *
 * Deletes a flashcard.
 *
 * Response (204 No Content):
 * (no body)
 *
 * Error responses:
 * - 400: Invalid UUID format
 * - 401: Authentication required
 * - 404: Flashcard not found
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Delete flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const deleted = await flashcardService.deleteFlashcard(user.id, idValidation.data);

    if (!deleted) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting flashcard:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to delete flashcard", 500);
  }
};

