import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashcardService } from "../flashcard.service";
import type { SupabaseClient } from "@/db/supabase.client";

vi.mock("../generation-log.service", () => ({
  GenerationLogService: vi.fn().mockImplementation(() => ({
    createAcceptanceLog: vi.fn().mockResolvedValue({ id: "gen_log_1" }),
  })),
}));

const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn();

  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
    update: mockUpdate,
    delete: mockDelete,
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  }));

  return {
    from: mockFrom,
    _mocks: { from: mockFrom, insert: mockInsert, select: mockSelect, single: mockSingle, update: mockUpdate, delete: mockDelete },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe("FlashcardService", () => {
  let service: FlashcardService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new FlashcardService(mockSupabase as SupabaseClient);
    vi.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  describe("createFlashcard", () => {
    it("creates flashcard with initial values", async () => {
      const userId = "user_1";
      const nowIso = new Date().toISOString();
      mockSupabase._mocks.single.mockResolvedValue({ data: { id: "f1" }, error: null });

      const result = await service.createFlashcard(userId, { front: "Q?", back: "A" });

      expect(result).toEqual({ id: "f1" });
      expect(mockSupabase._mocks.from).toHaveBeenCalledWith("flashcards");
      expect(mockSupabase._mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: userId, front: "Q?", back: "A", due_date: nowIso, stability: null, difficulty: null, review_history: null })
      );
    });

    it("creates acceptance log when generation_metadata is provided", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: { id: "f2", front: "Edited", back: "Edited" }, error: null });

      await service.createFlashcard("user_1", {
        front: "Edited",
        back: "Edited",
        generation_metadata: { original_front: "Orig Q", original_back: "Orig A" },
      });

      // GenerationLogService mock should have been constructed and called
      const { GenerationLogService } = await import("../generation-log.service");
      const instance = (GenerationLogService as unknown as vi.Mock).mock.results[0].value;
      expect(instance.createAcceptanceLog).toHaveBeenCalledWith("user_1", "f2", "Orig Q", "Orig A", "Edited", "Edited");
    });

    it("throws on database error", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { message: "DB fail" } });
      await expect(service.createFlashcard("u", { front: "Q", back: "A" })).rejects.toThrow(/Failed to create flashcard: DB fail/);
    });
  });

  describe("listFlashcards", () => {
    it("returns paginated list and calculates pages", async () => {
      // Emulate method-chaining builder that resolves to object with data/error/count
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      } as any;

      // Make from() return the chain, but when awaited, return final shape
      (mockSupabase._mocks.from as any).mockReturnValue(chain);
      (chain as any).then = (onFulfilled: any) => onFulfilled({ data: [{ id: "f1" }], error: null, count: 21 });

      const res = await service.listFlashcards("u", { page: 2, limit: 10, search: "quantum" });
      expect(res.pagination).toEqual({ page: 2, limit: 10, total: 21, pages: 3 });
      expect(res.data).toHaveLength(1);
    });

    it("throws on database error", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        data: null,
        error: { message: "DB err" },
        count: 0,
      });
      await expect(service.listFlashcards("u", { page: 1, limit: 20 })).rejects.toThrow(/Failed to list flashcards: DB err/);
    });
  });

  describe("getFlashcard", () => {
    it("returns data on success", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: { id: "f" }, error: null });
      await expect(service.getFlashcard("u", "f")).resolves.toEqual({ id: "f" });
    });
    it("returns null when PGRST116", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "Not found" } });
      await expect(service.getFlashcard("u", "missing")).resolves.toBeNull();
    });
    it("throws for other errors", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { code: "OTHER", message: "fail" } });
      await expect(service.getFlashcard("u", "x")).rejects.toThrow(/Failed to get flashcard: fail/);
    });
  });

  describe("updateFlashcard", () => {
    it("updates and returns record", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: { id: "f", front: "U" }, error: null });
      const res = await service.updateFlashcard("u", "f", { front: "U" });
      expect(res).toEqual({ id: "f", front: "U" });
    });
    it("returns null on PGRST116", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "nf" } });
      const res = await service.updateFlashcard("u", "f", { front: "U" });
      expect(res).toBeNull();
    });
    it("throws on other errors", async () => {
      mockSupabase._mocks.single.mockResolvedValue({ data: null, error: { code: "X", message: "boom" } });
      await expect(service.updateFlashcard("u", "f", { front: "U" })).rejects.toThrow(/Failed to update flashcard: boom/);
    });
  });

  describe("deleteFlashcard", () => {
    it("returns true when count > 0", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({ delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), error: null, count: 1 });
      await expect(service.deleteFlashcard("u", "f")).resolves.toBe(true);
    });
    it("returns false when count == 0", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({ delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), error: null, count: 0 });
      await expect(service.deleteFlashcard("u", "f")).resolves.toBe(false);
    });
    it("throws on DB error", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({ delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), error: { message: "x" }, count: null });
      await expect(service.deleteFlashcard("u", "f")).rejects.toThrow(/Failed to delete flashcard: x/);
    });
  });
});


