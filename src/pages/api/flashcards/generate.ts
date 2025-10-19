import type { APIRoute } from "astro";
import { generateFlashcardsSchema } from "@/lib/validation/schemas";
import { AIGenerationService } from "@/lib/services/ai-generation.service";
import { ErrorLogService } from "@/lib/services/error-log.service";
import { createErrorResponse, AIGenerationError, AITimeoutError } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * POST /api/flashcards/generate
 *
 * Generates flashcard candidates from source text using AI.
 *
 * Request body:
 * - source_text: string (1000-10000 characters)
 *
 * Response (200 OK):
 * {
 *   "candidates": [
 *     { "front": "Question", "back": "Answer" }
 *   ]
 * }
 *
 * Error responses:
 * - 400: Invalid source_text length
 * - 401: Authentication required
 * - 429: Rate limit exceeded (handled by middleware)
 * - 500: AI generation failed
 * - 504: AI service timeout
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  // 3. Validate input
  const validation = generateFlashcardsSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 4. Generate flashcards
  try {
    const errorLogService = new ErrorLogService(locals.supabase);
    const aiService = new AIGenerationService(errorLogService, import.meta.env.OPENROUTER_API_KEY);

    const candidates = await aiService.generateFlashcards(user.id, validation.data.source_text);

    return new Response(JSON.stringify({ candidates }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the full error for debugging
    console.error("Error in /api/flashcards/generate:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    if (error instanceof AITimeoutError) {
      return createErrorResponse("AI_TIMEOUT", "AI service took too long to respond. Please try again.", 504);
    }

    if (error instanceof AIGenerationError) {
      return createErrorResponse("AI_GENERATION_FAILED", "Failed to generate flashcards. Please try again.", 500, {
        error_id: error.errorId,
      });
    }

    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return createErrorResponse("INTERNAL_ERROR", errorMessage, 500);
  }
};
