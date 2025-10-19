import { z } from "zod";

// ============================================================================
// Common schemas
// ============================================================================

export const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Flashcard schemas
// ============================================================================

export const flashcardFrontSchema = z
  .string()
  .min(1, "Front text is required")
  .max(200, "Front text must not exceed 200 characters");

export const flashcardBackSchema = z
  .string()
  .min(1, "Back text is required")
  .max(500, "Back text must not exceed 500 characters");

export const createFlashcardSchema = z.object({
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
  generation_metadata: z
    .object({
      original_front: z.string(),
      original_back: z.string(),
    })
    .optional(),
});

export const updateFlashcardSchema = z.object({
  front: flashcardFrontSchema.optional(),
  back: flashcardBackSchema.optional(),
});

export const listFlashcardsSchema = paginationSchema.extend({
  search: z.string().optional(),
});

// ============================================================================
// Generation schemas
// ============================================================================

export const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters")
    .max(10000, "Source text must not exceed 10000 characters"),
});

export const createGenerationLogSchema = z.object({
  status: z.literal("rejected"),
  original_front: z.string(),
  original_back: z.string(),
});

// ============================================================================
// Study schemas
// ============================================================================

export const getDueFlashcardsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewRatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const submitReviewSchema = z.object({
  flashcard_id: uuidSchema,
  rating: reviewRatingSchema,
});
