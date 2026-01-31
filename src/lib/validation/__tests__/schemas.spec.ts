import { describe, it, expect } from "vitest";
import {
  uuidSchema,
  paginationSchema,
  flashcardFrontSchema,
  flashcardBackSchema,
  createFlashcardSchema,
  updateFlashcardSchema,
  listFlashcardsSchema,
  generateFlashcardsSchema,
  createGenerationLogSchema,
  getDueFlashcardsSchema,
  reviewRatingSchema,
  submitReviewSchema,
} from "../schemas";

describe("validation schemas", () => {
  describe("uuidSchema", () => {
    it("validates correct UUID v4", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = uuidSchema.safeParse(validUuid);

      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID format", () => {
      const invalidUuids = [
        "not-a-uuid",
        "123",
        "",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-446655440000-extra",
      ];

      for (const uuid of invalidUuids) {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      }
    });

    it("provides custom error message", () => {
      const result = uuidSchema.safeParse("invalid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid UUID format");
      }
    });
  });

  describe("paginationSchema", () => {
    it("accepts valid pagination params", () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20 });
    });

    it("applies default values", () => {
      const result = paginationSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20 });
    });

    it("coerces string numbers to integers", () => {
      const result = paginationSchema.safeParse({ page: "5", limit: "50" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 5, limit: 50 });
    });

    it("rejects page less than 1", () => {
      const result = paginationSchema.safeParse({ page: 0, limit: 20 });

      expect(result.success).toBe(false);
    });

    it("rejects limit less than 1", () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 0 });

      expect(result.success).toBe(false);
    });

    it("rejects limit greater than 100", () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 101 });

      expect(result.success).toBe(false);
    });

    it("accepts boundary values", () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 100 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 100 });
    });
  });

  describe("flashcardFrontSchema", () => {
    it("accepts valid front text", () => {
      const result = flashcardFrontSchema.safeParse("What is the capital of France?");

      expect(result.success).toBe(true);
    });

    it("rejects empty string", () => {
      const result = flashcardFrontSchema.safeParse("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Front text is required");
      }
    });

    it("rejects text exceeding 200 characters", () => {
      const longText = "a".repeat(201);
      const result = flashcardFrontSchema.safeParse(longText);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Front text must not exceed 200 characters");
      }
    });

    it("accepts text at exactly 200 characters", () => {
      const exactText = "a".repeat(200);
      const result = flashcardFrontSchema.safeParse(exactText);

      expect(result.success).toBe(true);
    });

    it("accepts text with special characters and unicode", () => {
      const result = flashcardFrontSchema.safeParse("What is Schrodinger equation? 🔬");

      expect(result.success).toBe(true);
    });
  });

  describe("flashcardBackSchema", () => {
    it("accepts valid back text", () => {
      const result = flashcardBackSchema.safeParse("Paris is the capital of France.");

      expect(result.success).toBe(true);
    });

    it("rejects empty string", () => {
      const result = flashcardBackSchema.safeParse("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Back text is required");
      }
    });

    it("rejects text exceeding 500 characters", () => {
      const longText = "a".repeat(501);
      const result = flashcardBackSchema.safeParse(longText);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Back text must not exceed 500 characters");
      }
    });

    it("accepts text at exactly 500 characters", () => {
      const exactText = "a".repeat(500);
      const result = flashcardBackSchema.safeParse(exactText);

      expect(result.success).toBe(true);
    });
  });

  describe("createFlashcardSchema", () => {
    it("accepts valid flashcard without metadata", () => {
      const result = createFlashcardSchema.safeParse({
        front: "Question?",
        back: "Answer.",
      });

      expect(result.success).toBe(true);
    });

    it("accepts valid flashcard with generation metadata", () => {
      const result = createFlashcardSchema.safeParse({
        front: "Edited question?",
        back: "Edited answer.",
        generation_metadata: {
          original_front: "Original question?",
          original_back: "Original answer.",
        },
      });

      expect(result.success).toBe(true);
    });

    it("rejects when front is missing", () => {
      const result = createFlashcardSchema.safeParse({
        back: "Answer.",
      });

      expect(result.success).toBe(false);
    });

    it("rejects when back is missing", () => {
      const result = createFlashcardSchema.safeParse({
        front: "Question?",
      });

      expect(result.success).toBe(false);
    });

    it("validates front and back length constraints", () => {
      const result = createFlashcardSchema.safeParse({
        front: "a".repeat(201),
        back: "b".repeat(501),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("updateFlashcardSchema", () => {
    it("accepts partial update with only front", () => {
      const result = updateFlashcardSchema.safeParse({
        front: "Updated question?",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only back", () => {
      const result = updateFlashcardSchema.safeParse({
        back: "Updated answer.",
      });

      expect(result.success).toBe(true);
    });

    it("accepts update with both fields", () => {
      const result = updateFlashcardSchema.safeParse({
        front: "Updated question?",
        back: "Updated answer.",
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty object (no updates)", () => {
      const result = updateFlashcardSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("validates length constraints on provided fields", () => {
      const result = updateFlashcardSchema.safeParse({
        front: "a".repeat(201),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("listFlashcardsSchema", () => {
    it("extends pagination schema with search", () => {
      const result = listFlashcardsSchema.safeParse({
        page: 2,
        limit: 50,
        search: "quantum",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        page: 2,
        limit: 50,
        search: "quantum",
      });
    });

    it("makes search optional", () => {
      const result = listFlashcardsSchema.safeParse({
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data?.search).toBeUndefined();
    });

    it("accepts empty search string", () => {
      const result = listFlashcardsSchema.safeParse({
        search: "",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("generateFlashcardsSchema", () => {
    it("accepts valid source text within range", () => {
      const validText = "a".repeat(5000);
      const result = generateFlashcardsSchema.safeParse({
        source_text: validText,
      });

      expect(result.success).toBe(true);
    });

    it("rejects source text below 1000 characters", () => {
      const shortText = "a".repeat(999);
      const result = generateFlashcardsSchema.safeParse({
        source_text: shortText,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Source text must be at least 1000 characters");
      }
    });

    it("accepts source text at exactly 1000 characters", () => {
      const exactText = "a".repeat(1000);
      const result = generateFlashcardsSchema.safeParse({
        source_text: exactText,
      });

      expect(result.success).toBe(true);
    });

    it("rejects source text above 10000 characters", () => {
      const longText = "a".repeat(10001);
      const result = generateFlashcardsSchema.safeParse({
        source_text: longText,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Source text must not exceed 10000 characters");
      }
    });

    it("accepts source text at exactly 10000 characters", () => {
      const exactText = "a".repeat(10000);
      const result = generateFlashcardsSchema.safeParse({
        source_text: exactText,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("createGenerationLogSchema", () => {
    it("accepts valid rejection log", () => {
      const result = createGenerationLogSchema.safeParse({
        status: "rejected",
        original_front: "Question?",
        original_back: "Answer.",
      });

      expect(result.success).toBe(true);
    });

    it("rejects non-rejected status", () => {
      const result = createGenerationLogSchema.safeParse({
        status: "accepted",
        original_front: "Question?",
        original_back: "Answer.",
      });

      expect(result.success).toBe(false);
    });

    it("requires all fields", () => {
      const result = createGenerationLogSchema.safeParse({
        status: "rejected",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("getDueFlashcardsSchema", () => {
    it("accepts valid limit", () => {
      const result = getDueFlashcardsSchema.safeParse({ limit: 50 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ limit: 50 });
    });

    it("applies default limit of 20", () => {
      const result = getDueFlashcardsSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ limit: 20 });
    });

    it("coerces string to number", () => {
      const result = getDueFlashcardsSchema.safeParse({ limit: "30" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ limit: 30 });
    });

    it("rejects limit below 1", () => {
      const result = getDueFlashcardsSchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
    });

    it("rejects limit above 100", () => {
      const result = getDueFlashcardsSchema.safeParse({ limit: 101 });

      expect(result.success).toBe(false);
    });
  });

  describe("reviewRatingSchema", () => {
    it("accepts valid ratings 1-4", () => {
      const validRatings = [1, 2, 3, 4];

      for (const rating of validRatings) {
        const result = reviewRatingSchema.safeParse(rating);
        expect(result.success).toBe(true);
      }
    });

    it("rejects rating 0", () => {
      const result = reviewRatingSchema.safeParse(0);

      expect(result.success).toBe(false);
    });

    it("rejects rating 5", () => {
      const result = reviewRatingSchema.safeParse(5);

      expect(result.success).toBe(false);
    });

    it("rejects non-integer ratings", () => {
      const result = reviewRatingSchema.safeParse(2.5);

      expect(result.success).toBe(false);
    });

    it("rejects string ratings", () => {
      const result = reviewRatingSchema.safeParse("3");

      expect(result.success).toBe(false);
    });
  });

  describe("submitReviewSchema", () => {
    it("accepts valid review submission", () => {
      const result = submitReviewSchema.safeParse({
        flashcard_id: "550e8400-e29b-41d4-a716-446655440000",
        rating: 3,
      });

      expect(result.success).toBe(true);
    });

    it("validates flashcard_id as UUID", () => {
      const result = submitReviewSchema.safeParse({
        flashcard_id: "not-a-uuid",
        rating: 3,
      });

      expect(result.success).toBe(false);
    });

    it("validates rating range", () => {
      const result = submitReviewSchema.safeParse({
        flashcard_id: "550e8400-e29b-41d4-a716-446655440000",
        rating: 5,
      });

      expect(result.success).toBe(false);
    });

    it("requires both fields", () => {
      const result = submitReviewSchema.safeParse({
        flashcard_id: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(result.success).toBe(false);
    });
  });
});
