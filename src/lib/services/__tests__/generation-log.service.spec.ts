import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenerationLogService } from "../generation-log.service";
import type { SupabaseClient } from "@/db/supabase.client";

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
  } as unknown as SupabaseClient & { _mocks: any };
};

describe("GenerationLogService", () => {
  let service: GenerationLogService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new GenerationLogService(mockSupabase as SupabaseClient);
  });

  describe("createRejectionLog", () => {
    it("creates rejection log with correct data", async () => {
      const userId = "user_123";
      const data = {
        status: "rejected" as const,
        original_front: "What is X?",
        original_back: "X is...",
      };

      const mockLog = {
        id: "log_123",
        user_id: userId,
        flashcard_id: null,
        status: "rejected",
        original_front: data.original_front,
        original_back: data.original_back,
        created_at: new Date().toISOString(),
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockLog,
        error: null,
      });

      const result = await service.createRejectionLog(userId, data);

      expect(mockSupabase._mocks.from).toHaveBeenCalledWith("generation_logs");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith({
        user_id: userId,
        flashcard_id: null,
        status: "rejected",
        original_front: data.original_front,
        original_back: data.original_back,
      });
      expect(result).toEqual(mockLog);
    });

    it("throws error when database operation fails", async () => {
      const userId = "user_123";
      const data = {
        status: "rejected" as const,
        original_front: "Question",
        original_back: "Answer",
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "DB_ERROR" },
      });

      await expect(service.createRejectionLog(userId, data)).rejects.toThrow(
        "Failed to create rejection log: Database error"
      );
    });

    it("handles special characters in content", async () => {
      const userId = "user_123";
      const data = {
        status: "rejected" as const,
        original_front: "What is Schrödinger's equation? 🔬",
        original_back: "It describes quantum states: iℏ∂ψ/∂t = Ĥψ",
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "log_123", ...data },
        error: null,
      });

      await service.createRejectionLog(userId, data);

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          original_front: data.original_front,
          original_back: data.original_back,
        })
      );
    });
  });

  describe("createAcceptanceLog", () => {
    it('creates log with "accepted" status when content unchanged', async () => {
      const userId = "user_123";
      const flashcardId = "card_456";
      const originalFront = "What is X?";
      const originalBack = "X is...";

      const mockLog = {
        id: "log_123",
        user_id: userId,
        flashcard_id: flashcardId,
        status: "accepted",
        original_front: originalFront,
        original_back: originalBack,
        created_at: new Date().toISOString(),
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockLog,
        error: null,
      });

      const result = await service.createAcceptanceLog(
        userId,
        flashcardId,
        originalFront,
        originalBack,
        originalFront, // Same as original
        originalBack // Same as original
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted",
          flashcard_id: flashcardId,
        })
      );
      expect(result.status).toBe("accepted");
    });

    it('creates log with "accepted_with_edit" when front changed', async () => {
      const userId = "user_123";
      const flashcardId = "card_456";
      const originalFront = "What is X?";
      const originalBack = "X is...";
      const editedFront = "What exactly is X?";

      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: "log_123",
          status: "accepted_with_edit",
        },
        error: null,
      });

      const result = await service.createAcceptanceLog(
        userId,
        flashcardId,
        originalFront,
        originalBack,
        editedFront, // Changed
        originalBack
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted_with_edit",
        })
      );
      expect(result.status).toBe("accepted_with_edit");
    });

    it('creates log with "accepted_with_edit" when back changed', async () => {
      const userId = "user_123";
      const flashcardId = "card_456";
      const originalFront = "What is X?";
      const originalBack = "X is...";
      const editedBack = "X is a comprehensive answer...";

      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: "log_123",
          status: "accepted_with_edit",
        },
        error: null,
      });

      await service.createAcceptanceLog(
        userId,
        flashcardId,
        originalFront,
        originalBack,
        originalFront,
        editedBack // Changed
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted_with_edit",
        })
      );
    });

    it('creates log with "accepted_with_edit" when both changed', async () => {
      const userId = "user_123";
      const flashcardId = "card_456";

      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: "log_123",
          status: "accepted_with_edit",
        },
        error: null,
      });

      await service.createAcceptanceLog(
        userId,
        flashcardId,
        "Original front",
        "Original back",
        "Edited front",
        "Edited back"
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted_with_edit",
        })
      );
    });

    it("detects whitespace-only changes as edits", async () => {
      const userId = "user_123";
      const flashcardId = "card_456";
      const originalFront = "What is X?";
      const editedFront = "What is X? "; // Added trailing space

      mockSupabase._mocks.single.mockResolvedValue({
        data: {
          id: "log_123",
          status: "accepted_with_edit",
        },
        error: null,
      });

      await service.createAcceptanceLog(userId, flashcardId, originalFront, "Back", editedFront, "Back");

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted_with_edit",
        })
      );
    });

    it("stores original content regardless of edits", async () => {
      const userId = "user_123";
      const flashcardId = "card_456";
      const originalFront = "Original question";
      const originalBack = "Original answer";

      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "log_123" },
        error: null,
      });

      await service.createAcceptanceLog(
        userId,
        flashcardId,
        originalFront,
        originalBack,
        "Edited question",
        "Edited answer"
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          original_front: originalFront,
          original_back: originalBack,
        })
      );
    });

    it("throws error when database operation fails", async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed", code: "INSERT_ERROR" },
      });

      await expect(service.createAcceptanceLog("user", "card", "f", "b", "f", "b")).rejects.toThrow(
        "Failed to create acceptance log: Insert failed"
      );
    });
  });

  describe("determineStatus (private method behavior)", () => {
    it("correctly identifies unchanged content through acceptance log", async () => {
      const content = {
        front: "Exact match",
        back: "Also exact",
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: { status: "accepted" },
        error: null,
      });

      const result = await service.createAcceptanceLog(
        "user",
        "card",
        content.front,
        content.back,
        content.front,
        content.back
      );

      expect(result.status).toBe("accepted");
    });

    it("correctly identifies edited content through acceptance log", async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: { status: "accepted_with_edit" },
        error: null,
      });

      const result = await service.createAcceptanceLog("user", "card", "Original", "Original", "Edited", "Original");

      expect(result.status).toBe("accepted_with_edit");
    });

    it("handles case-sensitive comparison", async () => {
      mockSupabase._mocks.single.mockResolvedValue({
        data: { status: "accepted_with_edit" },
        error: null,
      });

      await service.createAcceptanceLog(
        "user",
        "card",
        "What is X?",
        "Back",
        "what is x?", // Different case
        "Back"
      );

      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted_with_edit",
        })
      );
    });
  });
});
