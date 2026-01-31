import type { ChatCompletionOptions } from "../types";
import { OpenRouterError } from "./errors/OpenRouterError";

/**
 * Service for interacting with the OpenRouter.ai API
 * Provides methods for generating chat completions from various LLMs
 * Supports structured JSON responses via json_schema response format
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string = "https://openrouter.ai/api/v1";
  private readonly siteUrl: string;
  private readonly appName: string;

  /**
   * Initializes the OpenRouter service
   * @param apiKey - OpenRouter API key (from import.meta.env.OPENROUTER_API_KEY)
   * @param siteUrl - Optional site URL for API headers
   * @param appName - Optional app name for API headers
   * @throws {Error} If apiKey is not provided
   */
  constructor(apiKey?: string, siteUrl?: string, appName?: string) {
    // Try to get from parameter first, then fallback to process.env (for Node.js compatibility)
    const key = apiKey || process.env.OPENROUTER_API_KEY;

    if (!key) {
      throw new Error("OPENROUTER_API_KEY is required. Pass it as constructor parameter or set in environment.");
    }

    this.apiKey = key;
    this.siteUrl = siteUrl || process.env.SITE_URL || "http://localhost:4321";
    this.appName = appName || process.env.APP_NAME || "10xcards";
  }

  /**
   * Generates a chat completion using the OpenRouter API
   * @template T - The expected type of the response content
   * @param options - Configuration options for the chat completion
   * @returns Promise resolving to the parsed response content
   * @throws {OpenRouterError} If the API request fails
   */
  public async generateChatCompletion<T>(options: ChatCompletionOptions): Promise<T> {
    const payload = {
      model: options.model,
      messages: options.messages,
      response_format: options.response_format,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
    };

    try {
      const response = await this._sendRequest(payload);
      const content = (response as { choices: { message: { content: string } }[] }).choices[0].message.content;

      if (options.response_format?.type === "json_schema") {
        return JSON.parse(content) as T;
      }

      return content as T;
    } catch (error) {
      // expected by unit tests
      // eslint-disable-next-line no-console
      console.error("Error in generateChatCompletion:", error);
      throw error;
    }
  }

  /**
   * Sends a request to the OpenRouter API
   * @param payload - The request payload
   * @returns Promise resolving to the API response
   * @throws {OpenRouterError} If the request fails
   */
  private async _sendRequest(payload: object): Promise<unknown> {
    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": this.siteUrl,
        "X-Title": this.appName,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetails = await response.json().catch(() => ({}));
      throw new OpenRouterError(
        `API request failed with status ${response.status}: ${response.statusText}`,
        response.status,
        errorDetails
      );
    }

    return response.json();
  }
}
