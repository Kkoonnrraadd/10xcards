import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, cleanupRateLimitStore } from "../rate-limit";

describe("rate-limit utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows first request within limit", () => {
      const result = checkRateLimit("user_1", 10, 60000);

      expect(result.exceeded).toBe(false);
      expect(result.retryAfter).toBeUndefined();
    });

    it("allows multiple requests within limit", () => {
      const userId = "user_2";
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(userId, limit, 60000);
        expect(result.exceeded).toBe(false);
      }
    });

    it("blocks request when limit exceeded", () => {
      const userId = "user_3";
      const limit = 3;

      // Make 3 requests (at limit)
      for (let i = 0; i < limit; i++) {
        checkRateLimit(userId, limit, 60000);
      }

      // 4th request should be blocked
      const result = checkRateLimit(userId, limit, 60000);

      expect(result.exceeded).toBe(true);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("calculates correct retry-after time", () => {
      const userId = "user_4";
      const limit = 2;
      const windowMs = 60000; // 60 seconds

      // Exhaust limit
      checkRateLimit(userId, limit, windowMs);
      checkRateLimit(userId, limit, windowMs);

      // Advance time by 10 seconds
      vi.advanceTimersByTime(10000);

      // Next request should show ~50 seconds remaining
      const result = checkRateLimit(userId, limit, windowMs);

      expect(result.exceeded).toBe(true);
      expect(result.retryAfter).toBeGreaterThanOrEqual(49);
      expect(result.retryAfter).toBeLessThanOrEqual(51);
    });

    it("resets counter after window expires", () => {
      const userId = "user_5";
      const limit = 3;
      const windowMs = 60000;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        checkRateLimit(userId, limit, windowMs);
      }

      // Verify blocked
      let result = checkRateLimit(userId, limit, windowMs);
      expect(result.exceeded).toBe(true);

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1000);

      // Should be allowed again
      result = checkRateLimit(userId, limit, windowMs);
      expect(result.exceeded).toBe(false);
    });

    it("isolates rate limits per user", () => {
      const limit = 2;

      // User 1 exhausts limit
      checkRateLimit("user_a", limit, 60000);
      checkRateLimit("user_a", limit, 60000);
      const resultA = checkRateLimit("user_a", limit, 60000);

      // User 2 should not be affected
      const resultB = checkRateLimit("user_b", limit, 60000);

      expect(resultA.exceeded).toBe(true);
      expect(resultB.exceeded).toBe(false);
    });

    it("handles limit of 1 correctly", () => {
      const userId = "user_single";
      const limit = 1;

      const first = checkRateLimit(userId, limit, 60000);
      const second = checkRateLimit(userId, limit, 60000);

      expect(first.exceeded).toBe(false);
      expect(second.exceeded).toBe(true);
    });

    it("uses default window of 60 seconds when not specified", () => {
      const userId = "user_default";
      const limit = 5;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        checkRateLimit(userId, limit);
      }

      const result = checkRateLimit(userId, limit);

      expect(result.exceeded).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it("handles very short windows correctly", () => {
      const userId = "user_short";
      const limit = 2;
      const windowMs = 1000; // 1 second

      checkRateLimit(userId, limit, windowMs);
      checkRateLimit(userId, limit, windowMs);

      let result = checkRateLimit(userId, limit, windowMs);
      expect(result.exceeded).toBe(true);

      // Advance past window
      vi.advanceTimersByTime(1001);

      result = checkRateLimit(userId, limit, windowMs);
      expect(result.exceeded).toBe(false);
    });

    it("handles concurrent requests at exact limit boundary", () => {
      const userId = "user_boundary";
      const limit = 10;

      // Make exactly 10 requests
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(userId, limit, 60000);
        expect(result.exceeded).toBe(false);
      }

      // 11th request should be blocked
      const result = checkRateLimit(userId, limit, 60000);
      expect(result.exceeded).toBe(true);
    });
  });

  describe("cleanupRateLimitStore", () => {
    it("removes expired entries", () => {
      const windowMs = 60000;

      // Create entries for multiple users
      checkRateLimit("user_cleanup_1", 10, windowMs);
      checkRateLimit("user_cleanup_2", 10, windowMs);

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1000);

      // Cleanup should remove expired entries
      cleanupRateLimitStore();

      // New requests should start fresh (not be at count 2)
      const result1 = checkRateLimit("user_cleanup_1", 10, windowMs);
      const result2 = checkRateLimit("user_cleanup_2", 10, windowMs);

      expect(result1.exceeded).toBe(false);
      expect(result2.exceeded).toBe(false);
    });

    it("preserves active entries", () => {
      const windowMs = 60000;
      const userId = "user_active";

      // Make 3 requests
      checkRateLimit(userId, 5, windowMs);
      checkRateLimit(userId, 5, windowMs);
      checkRateLimit(userId, 5, windowMs);

      // Advance time but not past window
      vi.advanceTimersByTime(30000);

      // Cleanup should not affect active entry
      cleanupRateLimitStore();

      // Should still be at count 4 (next request)
      const result = checkRateLimit(userId, 5, windowMs);
      expect(result.exceeded).toBe(false);

      // And count 5 should still work
      const result2 = checkRateLimit(userId, 5, windowMs);
      expect(result2.exceeded).toBe(false);

      // But count 6 should be blocked
      const result3 = checkRateLimit(userId, 5, windowMs);
      expect(result3.exceeded).toBe(true);
    });

    it("handles empty store gracefully", () => {
      expect(() => cleanupRateLimitStore()).not.toThrow();
    });

    it("handles mixed expired and active entries", () => {
      const windowMs = 60000;

      // Create entry that will expire
      checkRateLimit("user_old", 10, windowMs);

      // Advance time
      vi.advanceTimersByTime(windowMs + 1000);

      // Create fresh entry
      checkRateLimit("user_new", 10, windowMs);

      // Cleanup
      cleanupRateLimitStore();

      // Old user should start fresh
      const oldResult = checkRateLimit("user_old", 10, windowMs);
      expect(oldResult.exceeded).toBe(false);

      // New user should continue from count 2
      const newResult = checkRateLimit("user_new", 10, windowMs);
      expect(newResult.exceeded).toBe(false);
    });
  });
});
