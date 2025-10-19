import type { APIRoute } from "astro";
import { createGenerationLogSchema } from "@/lib/validation/schemas";
import { GenerationLogService } from "@/lib/services/generation-log.service";
import { createErrorResponse } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

/**
 * POST /api/generation-logs
 *
 * Creates a log entry for a rejected AI-generated flashcard candidate.
 *
 * This endpoint is called when a user explicitly rejects a candidate
 * without creating a flashcard from it. Logs for accepted candidates
 * are created automatically by POST /api/flashcards when generation_metadata
 * is provided.
 *
 * Request body:
 * - status: "rejected" (literal)
 * - original_front: string
 * - original_back: string
 *
 * Response (201 Created):
 * {
 *   "id": "uuid",
 *   "user_id": "uuid",
 *   "flashcard_id": null,
 *   "status": "rejected",
 *   "original_front": "Question",
 *   "original_back": "Answer",
 *   "created_at": "2025-10-18T12:00:00Z"
 * }
 *
 * Error responses:
 * - 400: Invalid input (status must be "rejected")
 * - 401: Authentication required
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

  const validation = createGenerationLogSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Create log
  try {
    const logService = new GenerationLogService(locals.supabase);
    const log = await logService.createRejectionLog(user.id, validation.data);

    return new Response(JSON.stringify(log), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating generation log:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to create generation log", 500);
  }
};

