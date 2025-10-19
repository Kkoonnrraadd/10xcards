import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudyService } from "../study.service";
import type { SupabaseClient } from "@/db/supabase.client";

const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();

  const table = {
    select: mockSelect,
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: mockOrder,
    limit: mockLimit,
    update: mockUpdate,
    single: mockSingle,
  };

  const mockFrom = vi.fn((name: string) => table as any);

  return {
    from: mockFrom,
    _mocks: { from: mockFrom, select: mockSelect, single: mockSingle, update: mockUpdate, order: mockOrder, limit: mockLimit },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe("StudyService", () => {
  let service: StudyService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new StudyService(mockSupabase as SupabaseClient);
    vi.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  describe("getDueFlashcards", () => {
    it("returns due flashcards and total count", async () => {
      // First query returns data
      mockSupabase._mocks.select.mockReturnThis();
      mockSupabase._mocks.single.mockResolvedValueOnce(undefined);
      (mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        data: [{ id: "f1" }],
        error: null,
      });

      // Second query returns count
      ;(mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        count: 5,
        error: null,
      });

      const res = await service.getDueFlashcards("u", 20);
      expect(res.data).toEqual([{ id: "f1" }]);
      expect(res.total_due).toBe(5);
    });

    it("throws when list query fails", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        data: null,
        error: { message: "x" },
      });
      await expect(service.getDueFlashcards("u", 20)).rejects.toThrow(/Failed to get due flashcards: x/);
    });

    it("throws when count query fails", async () => {
      (mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        data: [],
        error: null,
      });
      ;(mockSupabase._mocks.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        count: null,
        error: { message: "y" },
      });
      await expect(service.getDueFlashcards("u", 20)).rejects.toThrow(/Failed to count due flashcards: y/);
    });
  });

  describe("submitReview", () => {
    it("throws NotFoundError when flashcard not found", async () => {
      mockSupabase._mocks.single.mockResolvedValueOnce({ data: null, error: { message: "nf" } });
      await expect(service.submitReview("u", "missing", 3)).rejects.toThrow(/Flashcard not found/);
    });

    it("updates flashcard with mock FSRS parameters and history", async () => {
      const flashcard = { id: "f", user_id: "u", stability: 1, difficulty: 5, review_history: null };
      // First fetch
      mockSupabase._mocks.single.mockResolvedValueOnce({ data: flashcard, error: null });
      // Update
      mockSupabase._mocks.single.mockResolvedValueOnce({ data: { id: "f", stability: 2.5 }, error: null });

      const res = await service.submitReview("u", "f", 3);
      expect(res).toEqual({ id: "f", stability: 2.5 });
    });

    it("propagates update errors", async () => {
      const flashcard = { id: "f", user_id: "u", stability: 1, difficulty: 5, review_history: [] };
      mockSupabase._mocks.single.mockResolvedValueOnce({ data: flashcard, error: null });
      mockSupabase._mocks.single.mockResolvedValueOnce({ data: null, error: { message: "upd" } });
      await expect(service.submitReview("u", "f", 2)).rejects.toThrow(/Failed to update flashcard: upd/);
    });
  });
});


