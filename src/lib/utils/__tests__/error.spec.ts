import { describe, it, expect } from "vitest";
import { createErrorResponse, AIGenerationError, AITimeoutError, NotFoundError } from "../error";
import type { ApiErrorCode } from "@/types";

describe("error utils", () => {
  describe("createErrorResponse", () => {
    it("creates a standard error response with required fields", () => {
      const code: ApiErrorCode = "VALIDATION_ERROR";
      const message = "Invalid input data";
      const status = 400;

      const response = createErrorResponse(code, message, status);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("includes error details when provided", async () => {
      const code: ApiErrorCode = "VALIDATION_ERROR";
      const message = "Invalid input";
      const status = 400;
      const details = { field: "email", reason: "invalid format" };

      const response = createErrorResponse(code, message, status, details);
      const body = await response.json();

      expect(body).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { field: "email", reason: "invalid format" },
        },
      });
    });

    it("omits details field when not provided", async () => {
      const response = createErrorResponse("NOT_FOUND", "Resource not found", 404);
      const body = await response.json();

      expect(body).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      });
      expect(body.error).not.toHaveProperty("details");
    });

    it("handles all API error codes correctly", async () => {
      const errorCodes: ApiErrorCode[] = [
        "VALIDATION_ERROR",
        "UNAUTHORIZED",
        "NOT_FOUND",
        "RATE_LIMIT_EXCEEDED",
        "AI_GENERATION_FAILED",
        "AI_TIMEOUT",
        "INTERNAL_ERROR",
      ];

      for (const code of errorCodes) {
        const response = createErrorResponse(code, "Test message", 500);
        const body = await response.json();

        expect(body.error.code).toBe(code);
      }
    });

    it("handles empty details object", async () => {
      const response = createErrorResponse("INTERNAL_ERROR", "Server error", 500, {});
      const body = await response.json();

      expect(body.error.details).toEqual({});
    });
  });

  describe("AIGenerationError", () => {
    it("creates error with message and errorId", () => {
      const message = "Failed to generate flashcards";
      const errorId = "err_123456";

      const error = new AIGenerationError(message, errorId);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("AIGenerationError");
      expect(error.message).toBe(message);
      expect(error.errorId).toBe(errorId);
    });

    it("preserves stack trace", () => {
      const error = new AIGenerationError("Test error", "err_123");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AIGenerationError");
    });

    it("is catchable as Error", () => {
      try {
        throw new AIGenerationError("Test", "err_123");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(AIGenerationError);
        if (e instanceof AIGenerationError) {
          expect(e.errorId).toBe("err_123");
        }
      }
    });
  });

  describe("AITimeoutError", () => {
    it("creates error with default message", () => {
      const error = new AITimeoutError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("AITimeoutError");
      expect(error.message).toBe("AI service timeout");
    });

    it("creates error with custom message", () => {
      const customMessage = "Request exceeded 60 seconds";
      const error = new AITimeoutError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.name).toBe("AITimeoutError");
    });

    it("is distinguishable from AIGenerationError", () => {
      const timeoutError = new AITimeoutError();
      const generationError = new AIGenerationError("Failed", "err_123");

      expect(timeoutError).not.toBeInstanceOf(AIGenerationError);
      expect(generationError).not.toBeInstanceOf(AITimeoutError);
    });
  });

  describe("NotFoundError", () => {
    it("creates error with default message", () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("NotFoundError");
      expect(error.message).toBe("Resource not found");
    });

    it("creates error with custom message", () => {
      const customMessage = "Flashcard with ID abc123 not found";
      const error = new NotFoundError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.name).toBe("NotFoundError");
    });

    it("preserves stack trace for debugging", () => {
      const error = new NotFoundError("User not found");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("NotFoundError");
    });
  });
});
