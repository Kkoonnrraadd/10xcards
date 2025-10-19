/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  /** Rate limit for AI generation endpoint (requests per minute) */
  GENERATION: 10,
  /** Default rate limit for all other endpoints (requests per minute) */
  DEFAULT: 100,
} as const;

/**
 * Validation limits for input data
 */
export const VALIDATION_LIMITS = {
  /** Minimum characters for source text in AI generation */
  SOURCE_TEXT_MIN: 1000,
  /** Maximum characters for source text in AI generation */
  SOURCE_TEXT_MAX: 10000,
  /** Maximum characters for flashcard front */
  FLASHCARD_FRONT_MAX: 200,
  /** Maximum characters for flashcard back */
  FLASHCARD_BACK_MAX: 500,
} as const;

/**
 * AI service configuration
 */
export const AI_CONFIG = {
  /**
   * OpenRouter model to use for flashcard generation
   *
   * TRULY FREE MODELS (must have :free suffix):
   * - "qwen/qwen-2-7b-instruct:free" - Qwen 2, stable, free (RECOMMENDED)
   * - "meta-llama/llama-3.2-3b-instruct:free" - Llama 3.2 (may have 502 errors)
   * - "google/gemini-2.0-flash-exp:free" - Gemini 2.0 experimental (low rate limit)
   * - "mistralai/mistral-7b-instruct:free" - Mistral 7B free
   *
   * PAID MODELS (require credits):
   * - "google/gemini-flash-1.5" - Fast, good quality (~$0.075/$0.30 per 1M tokens)
   * - "anthropic/claude-3.5-sonnet" - Best quality
   * - "openai/gpt-4o" - GPT-4 Omni, best quality/price ratio
   * - "openai/gpt-3.5-turbo" - Cheapest paid option
   *
   * Change this value to switch between models.
   * See: https://openrouter.ai/models for full list and pricing
   */
  MODEL: "openai/gpt-4o-mini",
  /** Timeout for AI requests in milliseconds */
  TIMEOUT_MS: 60000,
} as const;
