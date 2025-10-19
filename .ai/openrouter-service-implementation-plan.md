# OpenRouter Service Implementation Plan

## 1. Service Description

The `OpenRouterService` will act as a dedicated interface between our application and the OpenRouter.ai API. Its primary responsibility is to abstract the complexities of API communication, providing a simple and robust method for generating chat completions from various Large Language Models (LLMs).

The service will be designed to be secure, configurable, and easy to use within our Astro backend environment (specifically in API routes). It will handle request construction, authentication, error handling, and response parsing, with a key feature being the ability to request and parse structured JSON responses from models that support it.

## 2. Constructor Description

The service will be implemented as a TypeScript class to manage its state and dependencies cleanly.

```typescript
// Location: src/lib/services/OpenRouterService.ts

class OpenRouterService {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string = 'https://openrouter.ai/api/v1';
  private readonly siteUrl: string; // For headers
  private readonly appName: string; // For headers

  constructor() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set.');
    }
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.siteUrl = process.env.SITE_URL || 'http://localhost:4321';
    this.appName = process.env.APP_NAME || '10xcards';
  }
  
  // ... methods
}
```

-   **`constructor()`**: The constructor will not take any arguments. It will be responsible for sourcing the OpenRouter API key and other configuration directly from environment variables.
-   It will perform a crucial check for the `OPENROUTER_API_KEY`. If the key is not found in the environment variables, the constructor will throw an error immediately. This fail-fast approach prevents runtime errors in parts of the application that depend on the service.

## 3. Public Methods and Fields

The service will expose one primary public method.

### `public async generateChatCompletion<T>(options: ChatCompletionOptions): Promise<T>`

This is the main entry point for using the service.

-   **`options: ChatCompletionOptions`**: A single object containing all parameters for the request. This keeps the method signature clean and scalable.
-   **`Promise<T>`**: The method returns a promise that resolves to the content of the model's response. The generic type `T` allows the caller to specify the expected shape of the response, which is particularly useful for structured JSON.

**`ChatCompletionOptions` Type Definition:**

```typescript
// Location: src/types.ts

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type JsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
};

export type ResponseFormat = {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict?: boolean;
    schema: JsonSchema;
  };
};

export type ChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  // ... any other valid OpenRouter parameters
};
```

## 4. Private Methods and Fields

-   **`private readonly apiKey: string`**: Stores the API key securely.
-   **`private readonly apiBaseUrl: string`**: The base URL for the OpenRouter API.
-   **`private async _sendRequest(payload: unknown): Promise<any>`**: A private helper method to handle the actual `fetch` call. This method will be responsible for:
    -   Setting the correct `Content-Type` and `Authorization` headers.
    -   Adding recommended headers like `HTTP-Referer` and `X-Title`.
    -   Sending the POST request.
    -   Checking the HTTP response status and throwing an appropriate `OpenRouterError` for non-200 responses.
    -   Parsing the JSON response body.

## 5. Error Handling

Error handling will be centralized and predictable. A custom error class, `OpenRouterError`, will be created to provide context-specific information about failures.

```typescript
// Location: src/lib/errors/OpenRouterError.ts

export class OpenRouterError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails: any;

  constructor(message: string, statusCode: number, errorDetails?: any) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
  }
}
```

The `_sendRequest` method will catch errors and wrap them in this class. Potential HTTP status codes to handle include:
-   **`401 Unauthorized`**: Invalid or missing API key.
-   **`402 Payment Required`**: User has hit their spending limit.
-   **`429 Too Many Requests`**: Rate limit exceeded.
-   **`404 Not Found`**: The requested model is not available.
-   **`400 Bad Request`**: The request payload is malformed.
-   **`5xx`**: Server-side error on OpenRouter's end.

Any consumer of the service should wrap calls to `generateChatCompletion` in a `try...catch` block to handle these potential errors.

## 6. Security Considerations

1.  **API Key Management**: The `OPENROUTER_API_KEY` **must** be stored as an environment variable and should never be hardcoded in the source code or exposed to the client-side. The service is designed to run exclusively on the backend (within Astro API routes) to enforce this.
2.  **Input Validation**: While the service expects structured input via TypeScript types, the API routes that use this service should still validate any user-provided input before passing it to the service. This prevents potential injection of malicious or malformed data.
3.  **Rate Limiting**: Implement rate limiting on the API endpoints that use this service to prevent abuse and control costs.

## 7. Step-by-Step Implementation Plan

### Step 1: Update Environment Variables

1.  Add the following variables to your `.env` file:
    ```
    OPENROUTER_API_KEY="your-secret-key-here"
    SITE_URL="http://localhost:4321" # Or your production URL
    APP_NAME="10xcards"
    ```

### Step 2: Define Shared Types

1.  Create or update the file `src/types.ts` with the type definitions for `ChatMessage`, `JsonSchema`, `ResponseFormat`, and `ChatCompletionOptions` as specified in section 3.

### Step 3: Create Custom Error Class

1.  Create a new file `src/lib/errors/OpenRouterError.ts`.
2.  Implement the `OpenRouterError` class as defined in section 5.

### Step 4: Implement the `OpenRouterService`

1.  Create a new file `src/lib/services/OpenRouterService.ts`.
2.  Import the necessary types and the custom error.
3.  Implement the `OpenRouterService` class structure with the constructor as described in section 2.
4.  Implement the public `generateChatCompletion` method. This method should orchestrate the call.
    ```typescript
    import type { ChatCompletionOptions } from '../../types';
    import { OpenRouterError } from '../errors/OpenRouterError';

    // ... inside the class
    
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
            const content = response.choices[0].message.content;

            if (options.response_format?.type === 'json_schema') {
                return JSON.parse(content) as T;
            }
            
            return content as T;
        } catch (error) {
            // Log the error for debugging
            console.error('Error in generateChatCompletion:', error);
            // Re-throw the structured error for the caller to handle
            throw error;
        }
    }
    ```
5.  Implement the private `_sendRequest` helper method.
    ```typescript
    // ... inside the class

    private async _sendRequest(payload: object): Promise<any> {
        const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': this.siteUrl,
                'X-Title': this.appName,
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
    ```

### Step 5: Create an API Endpoint for Usage

1.  Create a new API route at `src/pages/api/chat.ts`.
2.  This endpoint will receive requests from the client, instantiate the `OpenRouterService`, and use it to interact with the API.

**Example `src/pages/api/chat.ts`:**
```typescript
import type { APIRoute } from 'astro';
import { OpenRouterService } from '../../lib/services/OpenRouterService';
import type { JsonSchema } from '../../types';
import { OpenRouterError } from '../../lib/errors/OpenRouterError';

// Define a schema for the expected response
const cardSchema: JsonSchema = {
  type: 'object',
  properties: {
    front: { type: 'string', description: 'The front content of the flashcard.' },
    back: { type: 'string', description: 'The back content of the flashcard.' },
  },
  required: ['front', 'back'],
};

export const POST: APIRoute = async ({ request }) => {
  const { prompt } = await request.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const openRouterService = new OpenRouterService();

  try {
    const cardContent = await openRouterService.generateChatCompletion<{ front: string; back: string }>({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: 'You are an AI assistant that creates flashcards. Respond with JSON that adheres to the provided schema.' },
        { role: 'user', content: `Create a flashcard from the following text: ${prompt}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'flashcard',
          strict: true,
          schema: cardSchema,
        },
      },
      temperature: 0.7,
    });

    return new Response(JSON.stringify(cardContent), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    if (error instanceof OpenRouterError) {
      return new Response(JSON.stringify({ error: error.message, details: error.errorDetails }), { status: error.statusCode });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), { status: 500 });
  }
};
```
This completes the implementation plan. By following these steps, a developer can create a robust, secure, and maintainable service for integrating OpenRouter into the application.
