import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterService } from "../openrouter.service";
import { OpenRouterError } from "../errors/OpenRouterError";

describe("OpenRouterService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (process as any).env.OPENROUTER_API_KEY;
  });

  it("throws when API key is missing", () => {
    delete (process as any).env.OPENROUTER_API_KEY;
    expect(() => new OpenRouterService()).toThrow(/OPENROUTER_API_KEY/);
  });

  it("parses json_schema content when provided", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ flashcards: [{ front: "Q", back: "A" }] }) } }],
      }),
    });

    const svc = new OpenRouterService("test-key");

    const result = await svc.generateChatCompletion<{ flashcards: { front: string; back: string }[] }>({
      model: "m",
      messages: [],
      response_format: {
        type: "json_schema",
        json_schema: { name: "flashcards", strict: true, schema: { type: "object" } },
      },
    });

    expect(result).toEqual({ flashcards: [{ front: "Q", back: "A" }] });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/chat/completions"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer test-key"),
          "Content-Type": "application/json",
          "HTTP-Referer": expect.any(String),
          "X-Title": expect.any(String),
        }),
      })
    );
  });

  it("throws OpenRouterError when response is not ok", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({ error: "bad" }),
    });

    const svc = new OpenRouterService("test-key");
    await expect(
      // @ts-expect-error accessing private for test coverage of error path
      svc["_sendRequest"]({})
    ).rejects.toBeInstanceOf(OpenRouterError);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterService } from "../openrouter.service";
import { OpenRouterError } from "../errors/OpenRouterError";
import type { ChatCompletionOptions } from "@/types";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OpenRouterService", () => {
  const validApiKey = "sk-or-test-key-123";
  const apiBaseUrl = "https://openrouter.ai/api/v1";

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.SITE_URL;
    delete process.env.APP_NAME;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("initializes with provided API key", () => {
      const service = new OpenRouterService(validApiKey);
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses API key from environment when not provided", () => {
      process.env.OPENROUTER_API_KEY = "env-key-123";
      const service = new OpenRouterService();
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("throws error when API key is missing", () => {
      expect(() => new OpenRouterService()).toThrow(
        "OPENROUTER_API_KEY is required. Pass it as constructor parameter or set in environment."
      );
    });

    it("uses custom site URL when provided", () => {
      const service = new OpenRouterService(validApiKey, "https://custom-site.com");
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses site URL from environment as fallback", () => {
      process.env.SITE_URL = "https://env-site.com";
      const service = new OpenRouterService(validApiKey);
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses default site URL when not provided", () => {
      const service = new OpenRouterService(validApiKey);
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses custom app name when provided", () => {
      const service = new OpenRouterService(validApiKey, undefined, "CustomApp");
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses app name from environment as fallback", () => {
      process.env.APP_NAME = "EnvApp";
      const service = new OpenRouterService(validApiKey);
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("uses default app name when not provided", () => {
      const service = new OpenRouterService(validApiKey);
      expect(service).toBeInstanceOf(OpenRouterService);
    });
  });

  describe("generateChatCompletion", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(validApiKey, "https://test-site.com", "TestApp");
    });

    it("successfully generates chat completion", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test response",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      const result = await service.generateChatCompletion<string>(options);

      expect(result).toBe("Test response");
      expect(mockFetch).toHaveBeenCalledWith(
        `${apiBaseUrl}/chat/completions`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${validApiKey}`,
            "HTTP-Referer": "https://test-site.com",
            "X-Title": "TestApp",
          }),
        })
      );
    });

    it("parses JSON response when json_schema format is specified", async () => {
      const mockJsonContent = { flashcards: [{ front: "Q", back: "A" }] };
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockJsonContent),
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Generate flashcards" }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "flashcards",
            strict: true,
            schema: {
              type: "object",
              properties: {},
            },
          },
        },
      };

      const result = await service.generateChatCompletion<typeof mockJsonContent>(options);

      expect(result).toEqual(mockJsonContent);
    });

    it("returns raw content when json_schema format is not specified", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Plain text response",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      const result = await service.generateChatCompletion<string>(options);

      expect(result).toBe("Plain text response");
    });

    it("includes all optional parameters in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }],
        }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      };

      await service.generateChatCompletion(options);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      });
    });

    it("throws OpenRouterError on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error details" }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      await expect(service.generateChatCompletion(options)).rejects.toThrow(OpenRouterError);
      await expect(service.generateChatCompletion(options)).rejects.toThrow(
        "API request failed with status 500: Internal Server Error"
      );
    });

    it("includes error details in OpenRouterError", async () => {
      const errorDetails = {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many requests",
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => errorDetails,
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
        expect.fail("Should have thrown OpenRouterError");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        if (error instanceof OpenRouterError) {
          expect(error.statusCode).toBe(429);
          expect(error.errorDetails).toEqual(errorDetails);
        }
      }
    });

    it("handles malformed error response gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
        expect.fail("Should have thrown OpenRouterError");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        if (error instanceof OpenRouterError) {
          expect(error.errorDetails).toEqual({});
        }
      }
    });

    it("handles 401 Unauthorized error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Invalid API key" }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        if (error instanceof OpenRouterError) {
          expect(error.statusCode).toBe(401);
        }
      }
    });

    it("handles 429 Rate Limit error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        if (error instanceof OpenRouterError) {
          expect(error.statusCode).toBe(429);
        }
      }
    });

    it("handles 503 Service Unavailable error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({ error: "Service temporarily unavailable" }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OpenRouterError);
        if (error instanceof OpenRouterError) {
          expect(error.statusCode).toBe(503);
        }
      }
    });

    it("sends correct headers with API key", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }],
        }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      await service.generateChatCompletion(options);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers["Authorization"]).toBe(`Bearer ${validApiKey}`);
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["HTTP-Referer"]).toBe("https://test-site.com");
      expect(headers["X-Title"]).toBe("TestApp");
    });

    it("handles multiple messages in conversation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }],
        }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      };

      await service.generateChatCompletion(options);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.messages).toHaveLength(4);
      expect(requestBody.messages).toEqual(options.messages);
    });

    it("logs errors to console", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      try {
        await service.generateChatCompletion(options);
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in generateChatCompletion:", expect.any(OpenRouterError));

      consoleErrorSpy.mockRestore();
    });
  });

  describe("request payload structure", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(validApiKey);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Response" } }],
        }),
      });
    });

    it("includes only provided fields in payload", async () => {
      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      };

      await service.generateChatCompletion(options);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toHaveProperty("model");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody.response_format).toBeUndefined();
      expect(requestBody.temperature).toBeUndefined();
    });

    it("includes response_format when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"result":"test"}' } }],
        }),
      });

      const options: ChatCompletionOptions = {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "test",
            schema: { type: "object", properties: {} },
          },
        },
      };

      await service.generateChatCompletion(options);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.response_format).toEqual(options.response_format);
    });
  });
});
