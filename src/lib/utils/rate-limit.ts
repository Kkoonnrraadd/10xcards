/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
  /** Number of requests made in current window */
  count: number;
  /** Timestamp when the current window resets (in milliseconds) */
  resetAt: number;
}

/**
 * In-memory store for rate limit counters
 * Key format: userId
 *
 * Note: This is a simple in-memory implementation suitable for single-instance
 * deployments. For multi-instance deployments, consider using Redis or another
 * distributed cache.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the rate limit has been exceeded */
  exceeded: boolean;
  /** Number of seconds until the limit resets (only present if exceeded) */
  retryAfter?: number;
}

/**
 * Checks if a user has exceeded their rate limit
 *
 * Uses a fixed window rate limiting algorithm. Each user gets a certain number
 * of requests per time window. Once the window expires, the counter resets.
 *
 * @param userId - ID of the user making the request
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object indicating if limit was exceeded and when it resets
 *
 * @example
 * ```typescript
 * const result = checkRateLimit(user.id, 10, 60000);
 * if (result.exceeded) {
 *   return createErrorResponse(
 *     "RATE_LIMIT_EXCEEDED",
 *     "Too many requests",
 *     429,
 *     { retry_after: result.retryAfter }
 *   );
 * }
 * ```
 */
export function checkRateLimit(userId: string, limit: number, windowMs: number = 60000): RateLimitResult {
  const now = Date.now();
  const key = userId;

  const entry = rateLimitStore.get(key);

  // If no entry exists or the window has expired, reset the counter
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { exceeded: false };
  }

  // If limit has been exceeded, return retry-after time
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { exceeded: true, retryAfter };
  }

  // Increment the counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return { exceeded: false };
}

/**
 * Cleans up expired entries from the rate limit store
 *
 * This function should be called periodically to prevent memory leaks
 * from accumulating old entries. It removes all entries whose time
 * window has expired.
 *
 * @example
 * ```typescript
 * // Clean up every 5 minutes
 * setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
 * ```
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Automatically clean up expired entries every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
