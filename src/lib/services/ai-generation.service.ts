import type { FlashcardCandidateDTO, JsonSchema } from "@/types";
import { ErrorLogService } from "./error-log.service";
import { AIGenerationError, AITimeoutError } from "../utils/error";
import { AI_CONFIG, VALIDATION_LIMITS } from "../constants";
import { OpenRouterService } from "../openrouter.service";
import { OpenRouterError } from "../errors/OpenRouterError";

/**
 * Service for generating flashcards using AI
 *
 * This service handles communication with the AI service (OpenRouter)
 * to generate flashcard candidates from source text. It includes
 * validation, error handling, and timeout management.
 */
export class AIGenerationService {
  private openRouterService: OpenRouterService;

  constructor(
    private errorLogService: ErrorLogService,
    openRouterApiKey?: string
  ) {
    this.openRouterService = new OpenRouterService(openRouterApiKey);
  }

  /**
   * Generates flashcard candidates from source text
   *
   * @param userId - ID of the user requesting generation
   * @param sourceText - Source text to generate flashcards from (1000-10000 chars)
   * @returns Array of flashcard candidates
   * @throws AITimeoutError if generation takes too long
   * @throws AIGenerationError if generation fails
   *
   * @example
   * ```typescript
   * const candidates = await aiService.generateFlashcards(
   *   user.id,
   *   "Long educational text about quantum physics..."
   * );
   * ```
   */
  async generateFlashcards(userId: string, sourceText: string): Promise<FlashcardCandidateDTO[]> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AITimeoutError("AI generation timeout")), AI_CONFIG.TIMEOUT_MS);
      });

      // Create generation promise
      const generationPromise = this.callOpenRouterAPI(sourceText);

      // Race between generation and timeout
      const candidates = await Promise.race([generationPromise, timeoutPromise]);

      // Validate candidates before returning
      const validCandidates = this.validateCandidates(candidates);

      if (validCandidates.length === 0) {
        throw new Error("No valid candidates generated");
      }

      return validCandidates;
    } catch (error) {
      // Handle timeout error separately (don't log to database)
      if (error instanceof AITimeoutError) {
        throw error;
      }

      // Log error to database
      const errorId = await this.errorLogService.logGenerationError(
        userId,
        AI_CONFIG.MODEL,
        sourceText,
        error instanceof Error ? error.name : "UNKNOWN_ERROR",
        error instanceof Error ? error.message : "Unknown error occurred"
      );

      // Re-throw as AIGenerationError
      throw new AIGenerationError("Failed to generate flashcards", errorId);
    }
  }

  /**
   * Calls OpenRouter API to generate flashcards
   *
   * @param sourceText - Source text to generate flashcards from
   * @returns Array of flashcard candidates
   * @throws OpenRouterError if API call fails
   */
  private async callOpenRouterAPI(sourceText: string): Promise<FlashcardCandidateDTO[]> {
    // Define JSON schema for flashcard candidates
    // Note: additionalProperties: false is required for strict mode
    const flashcardSchema: JsonSchema = {
      type: "object",
      properties: {
        flashcards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: {
                type: "string",
                description: `Question or prompt (max ${VALIDATION_LIMITS.FLASHCARD_FRONT_MAX} characters)`,
              },
              back: {
                type: "string",
                description: `Answer or explanation (max ${VALIDATION_LIMITS.FLASHCARD_BACK_MAX} characters)`,
              },
            },
            required: ["front", "back"],
            additionalProperties: false,
          },
        },
      },
      required: ["flashcards"],
      additionalProperties: false,
    };

    // Generate prompt
    const prompt = this.createPrompt(sourceText);

    // Call OpenRouter API with structured response
    const response = await this.openRouterService.generateChatCompletion<{
      flashcards: FlashcardCandidateDTO[];
    }>({
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational content creator specializing in creating effective flashcards for spaced repetition learning. Create clear, concise flashcards that test understanding of key concepts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flashcards",
          strict: true,
          schema: flashcardSchema,
        },
      },
      temperature: 0.7,
    });

    return response.flashcards;
  }

  /**
   * Creates a prompt for the AI model
   *
   * @param sourceText - Source text to generate flashcards from
   * @returns Formatted prompt for the AI
   */
  private createPrompt(sourceText: string): string {
    return `Generate flashcards from the following text. Each flashcard should:

1. Focus on a single key concept or fact
2. Have a clear, specific question on the front
3. Provide a concise, complete answer on the back
4. Be self-contained (understandable without the source text)

Requirements:
- front: Maximum ${VALIDATION_LIMITS.FLASHCARD_FRONT_MAX} characters
- back: Maximum ${VALIDATION_LIMITS.FLASHCARD_BACK_MAX} characters
- Generate 5-10 flashcards covering the most important concepts

Source text:
${sourceText}`;
  }

  /**
   * Validates flashcard candidates
   *
   * Filters out candidates that don't meet the length requirements:
   * - front: max 200 characters
   * - back: max 500 characters
   *
   * @param candidates - Array of candidates to validate
   * @returns Array of valid candidates
   */
  private validateCandidates(candidates: FlashcardCandidateDTO[]): FlashcardCandidateDTO[] {
    return candidates.filter((candidate) => {
      const frontValid = candidate.front.length > 0 && candidate.front.length <= VALIDATION_LIMITS.FLASHCARD_FRONT_MAX;
      const backValid = candidate.back.length > 0 && candidate.back.length <= VALIDATION_LIMITS.FLASHCARD_BACK_MAX;

      return frontValid && backValid;
    });
  }
}
