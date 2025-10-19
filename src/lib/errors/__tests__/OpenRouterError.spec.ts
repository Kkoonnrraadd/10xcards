import { describe, it, expect } from "vitest";
import { OpenRouterError } from "../OpenRouterError";

describe("OpenRouterError", () => {
  it("sets name, statusCode and errorDetails", () => {
    const details = { error: "x" };
    const err = new OpenRouterError("failed", 503, details);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("OpenRouterError");
    expect(err.message).toBe("failed");
    expect(err.statusCode).toBe(503);
    expect(err.errorDetails).toEqual(details);
  });
});

import { describe, it, expect } from 'vitest';
import { OpenRouterError } from '../OpenRouterError';

describe('OpenRouterError', () => {
  describe('constructor', () => {
    it('creates error with message and status code', () => {
      const error = new OpenRouterError('API request failed', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('OpenRouterError');
      expect(error.message).toBe('API request failed');
      expect(error.statusCode).toBe(500);
      expect(error.errorDetails).toBeUndefined();
    });

    it('creates error with error details', () => {
      const errorDetails = {
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests',
        },
      };

      const error = new OpenRouterError('Rate limit exceeded', 429, errorDetails);

      expect(error.statusCode).toBe(429);
      expect(error.errorDetails).toEqual(errorDetails);
    });

    it('preserves stack trace', () => {
      const error = new OpenRouterError('Test error', 500);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('OpenRouterError');
    });

    it('is instanceof Error', () => {
      const error = new OpenRouterError('Test', 500);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof OpenRouterError).toBe(true);
    });

    it('can be caught as Error', () => {
      try {
        throw new OpenRouterError('Test error', 500);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(OpenRouterError);
      }
    });
  });

  describe('statusCode property', () => {
    it('stores 400 Bad Request', () => {
      const error = new OpenRouterError('Bad request', 400);
      expect(error.statusCode).toBe(400);
    });

    it('stores 401 Unauthorized', () => {
      const error = new OpenRouterError('Unauthorized', 401);
      expect(error.statusCode).toBe(401);
    });

    it('stores 403 Forbidden', () => {
      const error = new OpenRouterError('Forbidden', 403);
      expect(error.statusCode).toBe(403);
    });

    it('stores 404 Not Found', () => {
      const error = new OpenRouterError('Not found', 404);
      expect(error.statusCode).toBe(404);
    });

    it('stores 429 Too Many Requests', () => {
      const error = new OpenRouterError('Rate limit', 429);
      expect(error.statusCode).toBe(429);
    });

    it('stores 500 Internal Server Error', () => {
      const error = new OpenRouterError('Server error', 500);
      expect(error.statusCode).toBe(500);
    });

    it('stores 502 Bad Gateway', () => {
      const error = new OpenRouterError('Bad gateway', 502);
      expect(error.statusCode).toBe(502);
    });

    it('stores 503 Service Unavailable', () => {
      const error = new OpenRouterError('Service unavailable', 503);
      expect(error.statusCode).toBe(503);
    });

    it('is readonly at compile time', () => {
      const error = new OpenRouterError('Test', 500);
      // TypeScript readonly is compile-time only, not runtime
      // In runtime, the property can be reassigned but TypeScript prevents it
      expect(error.statusCode).toBe(500);
      
      // This would fail TypeScript compilation but doesn't throw at runtime
      // @ts-expect-error - Testing readonly property
      error.statusCode = 400;
      expect(error.statusCode).toBe(400); // Actually changes in runtime
    });
  });

  describe('errorDetails property', () => {
    it('stores complex error details', () => {
      const details = {
        error: {
          code: 'invalid_request_error',
          message: 'Invalid model specified',
          param: 'model',
          type: 'invalid_request_error',
        },
        metadata: {
          request_id: 'req_123',
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const error = new OpenRouterError('Invalid request', 400, details);

      expect(error.errorDetails).toEqual(details);
    });

    it('stores string error details', () => {
      const error = new OpenRouterError('Error', 500, 'Simple string error');

      expect(error.errorDetails).toBe('Simple string error');
    });

    it('stores array error details', () => {
      const details = ['Error 1', 'Error 2', 'Error 3'];
      const error = new OpenRouterError('Multiple errors', 400, details);

      expect(error.errorDetails).toEqual(details);
    });

    it('is readonly at compile time', () => {
      const error = new OpenRouterError('Test', 500, { original: 'data' });
      // TypeScript readonly is compile-time only, not runtime
      expect(error.errorDetails).toEqual({ original: 'data' });
      
      // This would fail TypeScript compilation but doesn't throw at runtime
      // @ts-expect-error - Testing readonly property
      error.errorDetails = { modified: 'data' };
      expect(error.errorDetails).toEqual({ modified: 'data' }); // Actually changes in runtime
    });

    it('handles undefined error details', () => {
      const error = new OpenRouterError('Test', 500);

      expect(error.errorDetails).toBeUndefined();
    });

    it('handles null error details', () => {
      const error = new OpenRouterError('Test', 500, null);

      expect(error.errorDetails).toBeNull();
    });

    it('handles empty object error details', () => {
      const error = new OpenRouterError('Test', 500, {});

      expect(error.errorDetails).toEqual({});
    });
  });

  describe('message property', () => {
    it('stores descriptive error messages', () => {
      const message = 'API request failed with status 500: Internal Server Error';
      const error = new OpenRouterError(message, 500);

      expect(error.message).toBe(message);
    });

    it('handles empty message', () => {
      const error = new OpenRouterError('', 500);

      expect(error.message).toBe('');
    });

    it('handles multi-line messages', () => {
      const message = 'Error occurred:\nLine 1\nLine 2\nLine 3';
      const error = new OpenRouterError(message, 500);

      expect(error.message).toBe(message);
    });

    it('handles unicode in message', () => {
      const message = 'Error: API 失败 🔥';
      const error = new OpenRouterError(message, 500);

      expect(error.message).toBe(message);
    });
  });

  describe('error serialization', () => {
    it('can be converted to JSON', () => {
      const error = new OpenRouterError('Test error', 500, { detail: 'info' });

      const json = JSON.stringify({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        errorDetails: error.errorDetails,
      });

      expect(json).toContain('OpenRouterError');
      expect(json).toContain('Test error');
      expect(json).toContain('500');
    });

    it('preserves error information when re-thrown', () => {
      const originalError = new OpenRouterError('Original', 429, { rate: 'limit' });

      try {
        throw originalError;
      } catch (e) {
        if (e instanceof OpenRouterError) {
          expect(e.message).toBe('Original');
          expect(e.statusCode).toBe(429);
          expect(e.errorDetails).toEqual({ rate: 'limit' });
        }
      }
    });
  });

  describe('error comparison', () => {
    it('distinguishes between different error instances', () => {
      const error1 = new OpenRouterError('Error 1', 400);
      const error2 = new OpenRouterError('Error 2', 500);

      expect(error1).not.toBe(error2);
      expect(error1.statusCode).not.toBe(error2.statusCode);
    });

    it('identifies same error type', () => {
      const error1 = new OpenRouterError('Test', 500);
      const error2 = new OpenRouterError('Test', 500);

      expect(error1.name).toBe(error2.name);
      expect(error1.statusCode).toBe(error2.statusCode);
      expect(error1).not.toBe(error2); // Different instances
    });
  });
});

