import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIGenerationService } from "../ai-generation.service";
import { ErrorLogService } from "../error-log.service";
import { OpenRouterService } from "../../openrouter.service";
import { AIGenerationError, AITimeoutError } from "../../utils/error";
import { OpenRouterError } from "../../errors/OpenRouterError";
import { AI_CONFIG, VALIDATION_LIMITS } from "../../constants";
import type { FlashcardCandidateDTO } from "@/types";

// Mock dependencies
vi.mock("../error-log.service");
vi.mock("../../openrouter.service");

describe("AIGenerationService", () => {
  let service: AIGenerationService;
  let mockErrorLogService: ErrorLogService;
  let mockOpenRouterService: OpenRouterService;

  beforeEach(() => {
    vi.useFakeTimers();

    // Create mock instances
    mockErrorLogService = {
      logGenerationError: vi.fn().mockResolvedValue("error_123"),
    } as any;

    mockOpenRouterService = {
      generateChatCompletion: vi.fn(),
    } as any;

    // Mock OpenRouterService constructor
    vi.mocked(OpenRouterService).mockImplementation(() => mockOpenRouterService);

    service = new AIGenerationService(mockErrorLogService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("generateFlashcards", () => {
    const userId = "user_123";
    const sourceText = "a".repeat(5000);

    it("successfully generates flashcard candidates", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "Question 1?", back: "Answer 1" },
        { front: "Question 2?", back: "Answer 2" },
        { front: "Question 3?", back: "Answer 3" },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toEqual(mockCandidates);
      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_CONFIG.MODEL,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user" }),
          ]),
        })
      );
    });

    it("throws AITimeoutError when generation exceeds timeout", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ flashcards: [] }), AI_CONFIG.TIMEOUT_MS + 1000);
          })
      );

      const promise = service.generateFlashcards(userId, sourceText);

      // Advance time past timeout
      vi.advanceTimersByTime(AI_CONFIG.TIMEOUT_MS);

      await expect(promise).rejects.toThrow(AITimeoutError);
      await expect(promise).rejects.toThrow("AI generation timeout");

      // Should not log timeout errors to database
      expect(mockErrorLogService.logGenerationError).not.toHaveBeenCalled();
    });

    it("logs error and throws AIGenerationError on API failure", async () => {
      const apiError = new OpenRouterError("API request failed", 500);
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockRejectedValue(apiError);

      await expect(service.generateFlashcards(userId, sourceText)).rejects.toThrow(AIGenerationError);

      expect(mockErrorLogService.logGenerationError).toHaveBeenCalledWith(
        userId,
        AI_CONFIG.MODEL,
        sourceText,
        "OpenRouterError",
        "API request failed"
      );
    });

    it("includes error ID in AIGenerationError", async () => {
      const errorId = "error_unique_456";
      vi.mocked(mockErrorLogService.logGenerationError).mockResolvedValue(errorId);
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockRejectedValue(new Error("Failed"));

      try {
        await service.generateFlashcards(userId, sourceText);
        expect.fail("Should have thrown AIGenerationError");
      } catch (error) {
        expect(error).toBeInstanceOf(AIGenerationError);
        if (error instanceof AIGenerationError) {
          expect(error.errorId).toBe(errorId);
        }
      }
    });

    it("filters out candidates exceeding front length limit", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "Valid question?", back: "Valid answer" },
        { front: "x".repeat(VALIDATION_LIMITS.FLASHCARD_FRONT_MAX + 1), back: "Answer" },
        { front: "Another valid?", back: "Another answer" },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { front: "Valid question?", back: "Valid answer" },
        { front: "Another valid?", back: "Another answer" },
      ]);
    });

    it("filters out candidates exceeding back length limit", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "Question?", back: "Valid answer" },
        { front: "Question 2?", back: "x".repeat(VALIDATION_LIMITS.FLASHCARD_BACK_MAX + 1) },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toHaveLength(1);
      expect(result[0].front).toBe("Question?");
    });

    it("filters out candidates with empty front", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "", back: "Answer" },
        { front: "Valid?", back: "Valid" },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toHaveLength(1);
      expect(result[0].front).toBe("Valid?");
    });

    it("filters out candidates with empty back", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "Question?", back: "" },
        { front: "Valid?", back: "Valid" },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toHaveLength(1);
    });

    it("accepts candidates at exact length limits", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        {
          front: "x".repeat(VALIDATION_LIMITS.FLASHCARD_FRONT_MAX),
          back: "y".repeat(VALIDATION_LIMITS.FLASHCARD_BACK_MAX),
        },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toHaveLength(1);
      expect(result[0].front).toHaveLength(VALIDATION_LIMITS.FLASHCARD_FRONT_MAX);
      expect(result[0].back).toHaveLength(VALIDATION_LIMITS.FLASHCARD_BACK_MAX);
    });

    it("throws error when no valid candidates remain after filtering", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "x".repeat(201), back: "Answer" },
        { front: "Question", back: "y".repeat(501) },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      await expect(service.generateFlashcards(userId, sourceText)).rejects.toThrow(AIGenerationError);
      expect(mockErrorLogService.logGenerationError).toHaveBeenCalledWith(
        userId,
        AI_CONFIG.MODEL,
        sourceText,
        "Error",
        "No valid candidates generated"
      );
    });

    it("handles unicode characters in candidates correctly", async () => {
      const mockCandidates: FlashcardCandidateDTO[] = [
        { front: "What is Schrödinger's equation? 🔬", back: "iℏ∂ψ/∂t = Ĥψ" },
      ];

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: mockCandidates,
      });

      const result = await service.generateFlashcards(userId, sourceText);

      expect(result).toEqual(mockCandidates);
    });
  });

  describe("createPrompt (private method behavior)", () => {
    it("includes validation limits in prompt", async () => {
      const sourceText = "a".repeat(5000);

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", sourceText);

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining(`Maximum ${VALIDATION_LIMITS.FLASHCARD_FRONT_MAX} characters`),
            }),
          ]),
        })
      );
    });

    it("includes source text in prompt", async () => {
      const sourceText = "Educational content about quantum physics. ".repeat(50);

      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", sourceText);

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining(sourceText),
            }),
          ]),
        })
      );
    });

    it("includes system message with role definition", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", "a".repeat(5000));

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("expert educational content creator"),
            }),
          ]),
        })
      );
    });
  });

  describe("API call configuration", () => {
    it("uses correct model from config", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", "a".repeat(5000));

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_CONFIG.MODEL,
        })
      );
    });

    it("uses json_schema response format", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", "a".repeat(5000));

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: expect.objectContaining({
            type: "json_schema",
            json_schema: expect.objectContaining({
              name: "flashcards",
              strict: true,
              schema: expect.objectContaining({
                type: "object",
                properties: expect.objectContaining({
                  flashcards: expect.any(Object),
                }),
              }),
            }),
          }),
        })
      );
    });

    it("sets temperature to 0.7", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", "a".repeat(5000));

      expect(mockOpenRouterService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it("defines strict JSON schema with required fields", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockResolvedValue({
        flashcards: [{ front: "Q", back: "A" }],
      });

      await service.generateFlashcards("user", "a".repeat(5000));

      const call = vi.mocked(mockOpenRouterService.generateChatCompletion).mock.calls[0][0];
      const schema = call.response_format?.json_schema?.schema;

      expect(schema).toMatchObject({
        type: "object",
        required: ["flashcards"],
        additionalProperties: false,
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              required: ["front", "back"],
              additionalProperties: false,
            },
          },
        },
      });
    });
  });

  describe("error handling edge cases", () => {
    it("handles non-Error exceptions", async () => {
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockRejectedValue("String error");

      await expect(service.generateFlashcards("user", "a".repeat(5000))).rejects.toThrow(AIGenerationError);

      expect(mockErrorLogService.logGenerationError).toHaveBeenCalledWith(
        "user",
        AI_CONFIG.MODEL,
        expect.any(String),
        "UNKNOWN_ERROR",
        "Unknown error occurred"
      );
    });

    it("preserves original error message in logs", async () => {
      const originalError = new Error("Specific API failure reason");
      vi.mocked(mockOpenRouterService.generateChatCompletion).mockRejectedValue(originalError);

      await expect(service.generateFlashcards("user", "a".repeat(5000))).rejects.toThrow();

      expect(mockErrorLogService.logGenerationError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        "Error",
        "Specific API failure reason"
      );
    });
  });
});
