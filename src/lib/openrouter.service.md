# OpenRouter Service - Usage Guide

## Overview

The `OpenRouterService` provides a clean interface for interacting with the OpenRouter.ai API to generate chat completions from various Large Language Models (LLMs). It supports structured JSON responses via the `json_schema` response format.

## Setup

### 1. Environment Variables

Add the following variables to your `.env` file:

```env
OPENROUTER_API_KEY="your-secret-key-here"
SITE_URL="http://localhost:4321"  # Optional, defaults to localhost
APP_NAME="10xcards"                # Optional, defaults to 10xcards
```

### 2. Import the Service

```typescript
import { OpenRouterService } from "@/lib/openrouter.service";
import { OpenRouterError } from "@/lib/errors/OpenRouterError";
```

## Basic Usage

### Simple Text Completion

```typescript
const service = new OpenRouterService();

try {
  const response = await service.generateChatCompletion<string>({
    model: "anthropic/claude-3.5-sonnet",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is quantum physics?" },
    ],
    temperature: 0.7,
  });

  console.log(response); // String response from the model
} catch (error) {
  if (error instanceof OpenRouterError) {
    console.error(`API Error (${error.statusCode}):`, error.message);
  }
}
```

### Structured JSON Response

```typescript
import type { JsonSchema } from "@/types";

const service = new OpenRouterService();

// Define your response schema
const schema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "summary", "keyPoints"],
};

try {
  const response = await service.generateChatCompletion<{
    title: string;
    summary: string;
    keyPoints: string[];
  }>({
    model: "openai/gpt-4",
    messages: [
      { role: "system", content: "You are a content analyzer." },
      { role: "user", content: "Analyze this text: ..." },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_analysis",
        strict: true,
        schema: schema,
      },
    },
    temperature: 0.5,
  });

  console.log(response.title);
  console.log(response.keyPoints);
} catch (error) {
  // Handle errors
}
```

## API Reference

### Constructor

```typescript
new OpenRouterService();
```

- Reads configuration from environment variables
- Throws an error if `OPENROUTER_API_KEY` is not set

### Method: `generateChatCompletion<T>`

```typescript
async generateChatCompletion<T>(options: ChatCompletionOptions): Promise<T>
```

#### Parameters

- `options.model` (string, required): The model to use (e.g., `'anthropic/claude-3.5-sonnet'`, `'openai/gpt-4'`)
- `options.messages` (ChatMessage[], required): Array of conversation messages
- `options.response_format` (ResponseFormat, optional): Configuration for structured JSON responses
- `options.temperature` (number, optional): Sampling temperature (0-2)
- `options.max_tokens` (number, optional): Maximum tokens to generate
- `options.top_p` (number, optional): Nucleus sampling parameter

#### Returns

- `Promise<T>`: The parsed response content
  - If `response_format` is specified, returns parsed JSON object
  - Otherwise, returns the raw string content

#### Throws

- `OpenRouterError`: If the API request fails
  - `statusCode`: HTTP status code (401, 402, 429, 404, 400, 5xx)
  - `errorDetails`: Additional error information from the API

## Error Handling

### Error Types

The service throws `OpenRouterError` for all API-related failures:

```typescript
try {
  const response = await service.generateChatCompletion({...});
} catch (error) {
  if (error instanceof OpenRouterError) {
    switch (error.statusCode) {
      case 401:
        console.error('Invalid API key');
        break;
      case 402:
        console.error('Spending limit reached');
        break;
      case 429:
        console.error('Rate limit exceeded');
        break;
      case 404:
        console.error('Model not found');
        break;
      case 400:
        console.error('Invalid request:', error.errorDetails);
        break;
      default:
        console.error('API error:', error.message);
    }
  }
}
```

## Available Models

Common models available through OpenRouter:

- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet (recommended for complex tasks)
- `openai/gpt-4` - GPT-4 (high quality, slower)
- `openai/gpt-3.5-turbo` - GPT-3.5 Turbo (fast, cost-effective)
- `google/gemini-pro` - Google Gemini Pro

See [OpenRouter documentation](https://openrouter.ai/docs) for the full list.

## Integration Example: AI Generation Service

See `src/lib/services/ai-generation.service.ts` for a real-world example of how to integrate the OpenRouter service into a higher-level service with:

- Timeout handling
- Error logging
- Response validation
- Structured JSON schemas

## Security Notes

1. **Never expose the API key to the client**: The service should only be used in backend code (API routes, server-side functions)
2. **Rate limiting**: Implement rate limiting on endpoints that use this service
3. **Input validation**: Always validate user input before passing it to the service
4. **Error handling**: Always wrap service calls in try-catch blocks

## Testing

The service is integrated into the production endpoint `/api/flashcards/generate`:

```bash
curl -X POST http://localhost:4321/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d '{"source_text": "Your educational text here (1000-10000 characters)..."}'
```

## Troubleshooting

### "OPENROUTER_API_KEY environment variable is not set"

- Ensure your `.env` file contains the `OPENROUTER_API_KEY` variable
- Restart your development server after adding environment variables

### 401 Unauthorized

- Check that your API key is valid
- Verify the key is correctly set in the environment

### 429 Rate Limit Exceeded

- Implement exponential backoff
- Add rate limiting to your endpoints
- Consider upgrading your OpenRouter plan

### Timeout Issues

- Increase the timeout value in your calling code
- Use streaming for long responses (not currently supported)
- Consider using a faster model
