import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorLogService } from "../error-log.service";
import type { SupabaseClient } from "@/db/supabase.client";
import crypto from "crypto";

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn().mockReturnThis();

  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
  }));

  return {
    from: mockFrom,
    _mocks: {
      from: mockFrom,
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    },
  } as unknown as SupabaseClient & { _mocks: Record<string, any> };
};

describe("ErrorLogService", () => {
  let service: ErrorLogService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ErrorLogService(mockSupabase as SupabaseClient);
  });

  describe("logGenerationError", () => {
    it("logs error with all required fields", async () => {
      const userId = "user_123";
      const model = "openai/gpt-4o-mini";
      const sourceText = "a".repeat(5000);
      const errorCode = "TIMEOUT";
      const errorMessage = "Request timed out after 60s";

      const mockErrorLog = {
        id: "error_123",
        user_id: userId,
        model,
        source_text_hash: crypto.createHash("sha256").update(sourceText).digest("hex"),
        source_text_length: sourceText.length,
        error_code: errorCode,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockErrorLog,
        error: null,
      });

      const errorId = await service.logGenerationError(userId, model, sourceText, errorCode, errorMessage);

      expect(errorId).toBe("error_123");
      expect(mockSupabase._mocks.from).toHaveBeenCalledWith("generation_error_logs");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith({
        user_id: userId,
        model,
        source_text_hash: expect.any(String),
        source_text_length: 5000,
        error_code: errorCode,
        error_message: errorMessage,
      });
    });

    it("creates consistent hash for same source text", async () => {
      const sourceText = "Test content for hashing";
      const expectedHash = crypto.createHash("sha256").update(sourceText).digest("hex");

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError("user", "model", sourceText, "CODE", "Message");

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_hash: expectedHash,
        })
      );
    });

    it("creates different hashes for different source texts", async () => {
      const text1 = "First text";
      const text2 = "Second text";

      const hash1 = crypto.createHash("sha256").update(text1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(text2).digest("hex");

      expect(hash1).not.toBe(hash2);
    });

    it("stores source text length correctly", async () => {
      const shortText = "a".repeat(1000);
      const longText = "b".repeat(10000);

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError("user", "model", shortText, "CODE", "Message");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_length: 1000,
        })
      );

      await service.logGenerationError("user", "model", longText, "CODE", "Message");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_length: 10000,
        })
      );
    });

    it("handles unicode characters in source text", async () => {
      const unicodeText = "🔬".repeat(500) + "Schrödinger equation: iℏ∂ψ/∂t = Ĥψ".repeat(20);

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError("user", "model", unicodeText, "CODE", "Message");

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_length: unicodeText.length,
          source_text_hash: expect.any(String),
        })
      );
    });

    it("logs different error codes correctly", async () => {
      const errorCodes = ["TIMEOUT", "RATE_LIMIT", "INVALID_RESPONSE", "NETWORK_ERROR"];

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      for (const code of errorCodes) {
        await service.logGenerationError("user", "model", "text".repeat(300), code, "Message");

        expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            error_code: code,
          })
        );
      }
    });

    it("preserves full error message", async () => {
      const longErrorMessage =
        "Detailed error: API request failed with status 503. " +
        "Service temporarily unavailable. Retry after 120 seconds. " +
        "Request ID: req_abc123xyz. Trace ID: trace_def456uvw.";

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError("user", "model", "text".repeat(300), "API_ERROR", longErrorMessage);

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: longErrorMessage,
        })
      );
    });

    it("associates error with correct user", async () => {
      const userId = "user_abc123";

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError(userId, "model", "text".repeat(300), "CODE", "Message");

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
        })
      );
    });

    it("stores model name correctly", async () => {
      const models = ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "qwen/qwen-2-7b-instruct:free"];

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      for (const model of models) {
        await service.logGenerationError("user", model, "text".repeat(300), "CODE", "Message");

        expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            model,
          })
        );
      }
    });

    it("throws error when database operation fails", async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed", code: "DB_ERROR" },
      });

      await expect(service.logGenerationError("user", "model", "text".repeat(300), "CODE", "Message")).rejects.toThrow(
        "Failed to log generation error: Database connection failed"
      );
    });

    it("returns error ID on success", async () => {
      const expectedId = "error_unique_123";

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: expectedId },
        error: null,
      });

      const errorId = await service.logGenerationError("user", "model", "text".repeat(300), "CODE", "Message");

      expect(errorId).toBe(expectedId);
    });
  });

  describe("hashSourceText (private method behavior)", () => {
    it("produces SHA-256 hex hash", () => {
      const text = "Test text for hashing";
      const expectedHash = crypto.createHash("sha256").update(text).digest("hex");

      expect(expectedHash).toHaveLength(64); // SHA-256 hex is 64 characters
      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces deterministic hashes", () => {
      const text = "Consistent input";
      const hash1 = crypto.createHash("sha256").update(text).digest("hex");
      const hash2 = crypto.createHash("sha256").update(text).digest("hex");

      expect(hash1).toBe(hash2);
    });

    it("handles empty string", async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      await service.logGenerationError("user", "model", "", "CODE", "Message");

      const emptyHash = crypto.createHash("sha256").update("").digest("hex");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_hash: emptyHash,
          source_text_length: 0,
        })
      );
    });

    it("handles very long text efficiently", async () => {
      const veryLongText = "x".repeat(100000);

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "error_1" },
        error: null,
      });

      const startTime = Date.now();
      await service.logGenerationError("user", "model", veryLongText, "CODE", "Message");
      const endTime = Date.now();

      // Hashing should be fast even for large texts
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_text_length: 100000,
          source_text_hash: expect.any(String),
        })
      );
    });
  });
});
