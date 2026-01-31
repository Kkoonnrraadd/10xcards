# REST API Implementation Plan for 10xCards

## Spis treści

1. [Przegląd architektury](#1-przegląd-architektury)
2. [Struktura projektu](#2-struktura-projektu)
3. [Walidacja danych](#3-walidacja-danych)
4. [Serwisy](#4-serwisy)
5. [Endpointy API](#5-endpointy-api)
6. [Obsługa błędów](#6-obsługa-błędów)
7. [Bezpieczeństwo](#7-bezpieczeństwo)
8. [Rate Limiting](#8-rate-limiting)
9. [Kroki implementacji](#9-kroki-implementacji)

---

## 1. Przegląd architektury

### 1.1. Wzorzec architektoniczny

Aplikacja wykorzystuje architekturę warstwową:

```
┌─────────────────────────────────────┐
│   API Routes (src/pages/api/)      │  ← Astro API endpoints
├─────────────────────────────────────┤
│   Validation Layer (Zod schemas)   │  ← Input validation
├─────────────────────────────────────┤
│   Services (src/lib/services/)     │  ← Business logic
├─────────────────────────────────────┤
│   Supabase Client + RLS            │  ← Data access & auth
├─────────────────────────────────────┤
│   PostgreSQL Database              │  ← Data persistence
└─────────────────────────────────────┘
```

### 1.2. Przepływ żądania

1. **Request** → Astro API route
2. **Authentication** → Wyciągnięcie JWT z nagłówka Authorization
3. **Validation** → Walidacja danych wejściowych za pomocą Zod
4. **Service Layer** → Wykonanie logiki biznesowej
5. **Database** → Operacje na bazie danych przez Supabase (z RLS)
6. **Response** → Zwrócenie odpowiedzi w formacie JSON

### 1.3. Stack technologiczny

- **Astro 5**: Framework dla API routes
- **TypeScript 5**: Statyczne typowanie
- **Supabase**: Backend-as-a-Service (PostgreSQL, Auth, RLS)
- **Zod**: Walidacja schematów
- **OpenRouter**: API do generowania fiszek przez AI
- **ts-fsrs**: Algorytm spaced repetition

---

## 2. Struktura projektu

### 2.1. Struktura katalogów

```
src/
├── pages/
│   └── api/
│       ├── flashcards/
│       │   ├── index.ts              # GET, POST /api/flashcards
│       │   ├── [id].ts               # GET, PATCH, DELETE /api/flashcards/:id
│       │   └── generate.ts           # POST /api/flashcards/generate
│       ├── generation-logs/
│       │   └── index.ts              # POST /api/generation-logs
│       └── study/
│           ├── due.ts                # GET /api/study/due
│           └── review.ts             # POST /api/study/review
├── lib/
│   ├── services/
│   │   ├── flashcard.service.ts     # CRUD operations for flashcards
│   │   ├── ai-generation.service.ts # AI generation logic
│   │   ├── generation-log.service.ts # Generation log operations
│   │   ├── study.service.ts         # Study session & FSRS logic
│   │   └── error-log.service.ts     # Error logging
│   ├── validation/
│   │   └── schemas.ts               # Zod validation schemas
│   ├── utils/
│   │   ├── auth.ts                  # Authentication helpers
│   │   ├── error.ts                 # Error handling utilities
│   │   └── rate-limit.ts            # Rate limiting logic
│   └── constants.ts                 # Application constants
├── db/
│   ├── supabase.client.ts           # Supabase client initialization
│   └── database.types.ts            # Generated database types
├── types.ts                         # Shared DTOs
└── middleware/
    └── index.ts                     # Astro middleware (auth, rate limiting)
```

### 2.2. Konwencje nazewnictwa

- **API routes**: kebab-case (np. `flashcards`, `generation-logs`)
- **Serwisy**: camelCase z sufiksem `.service.ts`
- **Typy**: PascalCase z sufiksem `DTO`
- **Funkcje**: camelCase
- **Stałe**: UPPER_SNAKE_CASE

---

## 3. Walidacja danych

### 3.1. Lokalizacja: `src/lib/validation/schemas.ts`

Wszystkie schematy walidacji Zod w jednym pliku dla łatwego zarządzania.

### 3.2. Schematy walidacji

```typescript
import { z } from "zod";

// ============================================================================
// Common schemas
// ============================================================================

export const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Flashcard schemas
// ============================================================================

export const flashcardFrontSchema = z
  .string()
  .min(1, "Front text is required")
  .max(200, "Front text must not exceed 200 characters");

export const flashcardBackSchema = z
  .string()
  .min(1, "Back text is required")
  .max(500, "Back text must not exceed 500 characters");

export const createFlashcardSchema = z.object({
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
  generation_metadata: z
    .object({
      original_front: z.string(),
      original_back: z.string(),
    })
    .optional(),
});

export const updateFlashcardSchema = z.object({
  front: flashcardFrontSchema.optional(),
  back: flashcardBackSchema.optional(),
});

export const listFlashcardsSchema = paginationSchema.extend({
  search: z.string().optional(),
});

// ============================================================================
// Generation schemas
// ============================================================================

export const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters")
    .max(10000, "Source text must not exceed 10000 characters"),
});

export const createGenerationLogSchema = z.object({
  status: z.literal("rejected"),
  original_front: z.string(),
  original_back: z.string(),
});

// ============================================================================
// Study schemas
// ============================================================================

export const getDueFlashcardsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewRatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const submitReviewSchema = z.object({
  flashcard_id: uuidSchema,
  rating: reviewRatingSchema,
});
```

### 3.3. Użycie w API routes

```typescript
// Przykład walidacji w endpoint
const result = createFlashcardSchema.safeParse(body);
if (!result.success) {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: result.error.flatten(),
      },
    }),
    { status: 400 }
  );
}
```

---

## 4. Serwisy

### 4.1. Flashcard Service (`src/lib/services/flashcard.service.ts`)

**Odpowiedzialność**: CRUD operations dla fiszek

**Metody**:

```typescript
export class FlashcardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Tworzy nową fiszkę
   * @param userId - ID użytkownika
   * @param data - Dane fiszki
   * @returns Utworzona fiszka
   */
  async createFlashcard(userId: string, data: CreateFlashcardRequestDTO): Promise<FlashcardDTO>;

  /**
   * Pobiera listę fiszek z paginacją i wyszukiwaniem
   * @param userId - ID użytkownika
   * @param query - Parametry zapytania (page, limit, search)
   * @returns Lista fiszek z metadanymi paginacji
   */
  async listFlashcards(userId: string, query: ListFlashcardsQueryDTO): Promise<ListFlashcardsResponseDTO>;

  /**
   * Pobiera pojedynczą fiszkę
   * @param userId - ID użytkownika
   * @param flashcardId - ID fiszki
   * @returns Fiszka lub null jeśli nie znaleziono
   */
  async getFlashcard(userId: string, flashcardId: string): Promise<FlashcardDTO | null>;

  /**
   * Aktualizuje fiszkę
   * @param userId - ID użytkownika
   * @param flashcardId - ID fiszki
   * @param data - Dane do aktualizacji
   * @returns Zaktualizowana fiszka lub null jeśli nie znaleziono
   */
  async updateFlashcard(
    userId: string,
    flashcardId: string,
    data: UpdateFlashcardRequestDTO
  ): Promise<FlashcardDTO | null>;

  /**
   * Usuwa fiszkę
   * @param userId - ID użytkownika
   * @param flashcardId - ID fiszki
   * @returns true jeśli usunięto, false jeśli nie znaleziono
   */
  async deleteFlashcard(userId: string, flashcardId: string): Promise<boolean>;
}
```

**Szczegóły implementacji**:

- Używa Supabase client do operacji na bazie danych
- RLS policies automatycznie filtrują dane po user_id
- Dla `listFlashcards`: używa `ilike` dla wyszukiwania, `range()` dla paginacji
- Dla `createFlashcard`: jeśli jest `generation_metadata`, wywołuje `GenerationLogService`

### 4.2. AI Generation Service (`src/lib/services/ai-generation.service.ts`)

**Odpowiedzialność**: Generowanie fiszek przez AI

**Metody**:

```typescript
export class AIGenerationService {
  constructor(
    private openRouterApiKey: string,
    private errorLogService: ErrorLogService
  ) {}

  /**
   * Generuje kandydatów fiszek z tekstu źródłowego
   * @param userId - ID użytkownika
   * @param sourceText - Tekst źródłowy
   * @returns Lista kandydatów fiszek
   * @throws AIGenerationError w przypadku błędu
   */
  async generateFlashcards(userId: string, sourceText: string): Promise<FlashcardCandidateDTO[]>;

  /**
   * Tworzy prompt dla AI
   * @param sourceText - Tekst źródłowy
   * @returns Sformatowany prompt
   */
  private createPrompt(sourceText: string): string;

  /**
   * Parsuje odpowiedź AI do kandydatów fiszek
   * @param response - Odpowiedź z API
   * @returns Lista kandydatów
   */
  private parseAIResponse(response: any): FlashcardCandidateDTO[];

  /**
   * Waliduje kandydatów (front ≤200, back ≤500)
   * @param candidates - Lista kandydatów
   * @returns Przefiltrowana lista poprawnych kandydatów
   */
  private validateCandidates(candidates: FlashcardCandidateDTO[]): FlashcardCandidateDTO[];
}
```

**Szczegóły implementacji**:

- Endpoint OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Timeout: 60 sekund
- Model: `openai/gpt-4` (lub konfigurowalny)
- Format odpowiedzi: JSON object
- W przypadku błędu: loguje do `generation_error_logs` przez `ErrorLogService`

**Przykładowy prompt**:

```
Generate flashcards from the following text. Each flashcard should have:
- front: A question or prompt (max 200 characters)
- back: An answer or explanation (max 500 characters)

Create 5-10 flashcards that cover the key concepts.

Text:
{source_text}

Return as JSON array: [{"front": "...", "back": "..."}, ...]
```

### 4.3. Generation Log Service (`src/lib/services/generation-log.service.ts`)

**Odpowiedzialność**: Zarządzanie logami generacji

**Metody**:

```typescript
export class GenerationLogService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Tworzy log dla odrzuconej fiszki
   * @param userId - ID użytkownika
   * @param data - Dane logu
   * @returns Utworzony log
   */
  async createRejectionLog(userId: string, data: CreateGenerationLogRequestDTO): Promise<GenerationLogDTO>;

  /**
   * Tworzy log dla zaakceptowanej fiszki (z lub bez edycji)
   * @param userId - ID użytkownika
   * @param flashcardId - ID utworzonej fiszki
   * @param originalFront - Oryginalna treść przodu
   * @param originalBack - Oryginalna treść tyłu
   * @param currentFront - Aktualna treść przodu
   * @param currentBack - Aktualna treść tyłu
   * @returns Utworzony log
   */
  async createAcceptanceLog(
    userId: string,
    flashcardId: string,
    originalFront: string,
    originalBack: string,
    currentFront: string,
    currentBack: string
  ): Promise<GenerationLogDTO>;

  /**
   * Określa status na podstawie porównania
   * @param original - Oryginalna treść
   * @param current - Aktualna treść
   * @returns 'accepted' lub 'accepted_with_edit'
   */
  private determineStatus(
    originalFront: string,
    originalBack: string,
    currentFront: string,
    currentBack: string
  ): "accepted" | "accepted_with_edit";
}
```

### 4.4. Study Service (`src/lib/services/study.service.ts`)

**Odpowiedzialność**: Sesje nauki i algorytm FSRS

**Metody**:

```typescript
import { FSRS, Rating, Card } from "ts-fsrs";

export class StudyService {
  private fsrs: FSRS;

  constructor(private supabase: SupabaseClient) {
    this.fsrs = new FSRS();
  }

  /**
   * Pobiera fiszki do powtórki
   * @param userId - ID użytkownika
   * @param limit - Maksymalna liczba fiszek
   * @returns Lista fiszek do powtórki i całkowita liczba zaległych
   */
  async getDueFlashcards(userId: string, limit: number): Promise<DueFlashcardsResponseDTO>;

  /**
   * Przetwarza recenzję fiszki i aktualizuje parametry FSRS
   * @param userId - ID użytkownika
   * @param flashcardId - ID fiszki
   * @param rating - Ocena (1-4)
   * @returns Zaktualizowana fiszka
   */
  async submitReview(userId: string, flashcardId: string, rating: ReviewRating): Promise<FlashcardDTO>;

  /**
   * Oblicza nowe parametry FSRS
   * @param flashcard - Aktualna fiszka
   * @param rating - Ocena
   * @returns Nowe parametry (stability, difficulty, due_date)
   */
  private calculateFSRSParameters(
    flashcard: FlashcardDTO,
    rating: ReviewRating
  ): {
    stability: number;
    difficulty: number;
    due_date: string;
  };

  /**
   * Aktualizuje historię recenzji
   * @param currentHistory - Aktualna historia
   * @param rating - Ocena
   * @returns Zaktualizowana historia
   */
  private updateReviewHistory(currentHistory: ReviewHistory | null, rating: ReviewRating): ReviewHistory;
}
```

**Szczegóły implementacji FSRS**:

```typescript
// Przykład użycia ts-fsrs
const card: Card = {
  stability: flashcard.stability || undefined,
  difficulty: flashcard.difficulty || undefined,
};

const schedulingCards = this.fsrs.repeat(card, new Date());
const selectedCard = schedulingCards[rating]; // rating: Again=0, Hard=1, Good=2, Easy=3

// Mapowanie ratingu z API (1-4) na FSRS (0-3)
const fsrsRating = rating - 1;
```

### 4.5. Error Log Service (`src/lib/services/error-log.service.ts`)

**Odpowiedzialność**: Logowanie błędów generacji AI

**Metody**:

```typescript
import crypto from "crypto";

export class ErrorLogService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Loguje błąd generacji AI
   * @param userId - ID użytkownika
   * @param model - Nazwa modelu AI
   * @param sourceText - Tekst źródłowy
   * @param errorCode - Kod błędu
   * @param errorMessage - Komunikat błędu
   * @returns ID utworzonego logu błędu
   */
  async logGenerationError(
    userId: string,
    model: string,
    sourceText: string,
    errorCode: string,
    errorMessage: string
  ): Promise<string>;

  /**
   * Tworzy hash SHA-256 tekstu źródłowego
   * @param text - Tekst do zahashowania
   * @returns Hash w formacie hex
   */
  private hashSourceText(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }
}
```

---

## 5. Endpointy API

### 5.1. POST /api/flashcards/generate

**Plik**: `src/pages/api/flashcards/generate.ts`

**Opis**: Generuje kandydatów fiszek z tekstu źródłowego przez AI.

**Request**:

```typescript
POST /api/flashcards/generate
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
Body: {
  "source_text": "string (1000-10000 chars)"
}
```

**Response (200 OK)**:

```typescript
{
  "candidates": [
    {
      "front": "string (max 200 chars)",
      "back": "string (max 500 chars)"
    }
  ]
}
```

**Kody błędów**:

- 400: Nieprawidłowa długość source_text
- 401: Brak lub nieprawidłowy token
- 429: Przekroczono limit zapytań (10/min)
- 500: Błąd usługi AI
- 504: Timeout usługi AI

**Przepływ danych**:

```
1. Wyciągnij JWT z nagłówka Authorization
2. Zwaliduj token przez Supabase
3. Zwaliduj source_text (1000-10000 chars) przez Zod
4. Wywołaj AIGenerationService.generateFlashcards()
   4.1. Wyślij request do OpenRouter API
   4.2. Parsuj odpowiedź JSON
   4.3. Waliduj kandydatów (front ≤200, back ≤500)
   4.4. W przypadku błędu: loguj przez ErrorLogService
5. Zwróć kandydatów (nie zapisuj do bazy)
```

**Implementacja**:

```typescript
import type { APIRoute } from "astro";
import { generateFlashcardsSchema } from "@/lib/validation/schemas";
import { AIGenerationService } from "@/lib/services/ai-generation.service";
import { ErrorLogService } from "@/lib/services/error-log.service";
import { createErrorResponse } from "@/lib/utils/error";
import { extractUser } from "@/lib/utils/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  // 3. Validate input
  const validation = generateFlashcardsSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 4. Generate flashcards
  try {
    const errorLogService = new ErrorLogService(locals.supabase);
    const aiService = new AIGenerationService(import.meta.env.OPENROUTER_API_KEY, errorLogService);

    const candidates = await aiService.generateFlashcards(user.id, validation.data.source_text);

    return new Response(JSON.stringify({ candidates }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof AITimeoutError) {
      return createErrorResponse("AI_TIMEOUT", "AI service took too long to respond. Please try again.", 504);
    }

    if (error instanceof AIGenerationError) {
      return createErrorResponse("AI_GENERATION_FAILED", "Failed to generate flashcards. Please try again.", 500, {
        error_id: error.errorId,
      });
    }

    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};
```

---

### 5.2. POST /api/flashcards

**Plik**: `src/pages/api/flashcards/index.ts`

**Opis**: Tworzy nową fiszkę (ręcznie lub akceptując kandydata AI).

**Request**:

```typescript
POST /api/flashcards
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
Body: {
  "front": "string (max 200 chars)",
  "back": "string (max 500 chars)",
  "generation_metadata"?: {
    "original_front": "string",
    "original_back": "string"
  }
}
```

**Response (201 Created)**:

```typescript
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": null,
  "difficulty": null,
  "review_history": null,
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Kody błędów**:

- 400: Nieprawidłowe dane wejściowe
- 401: Brak lub nieprawidłowy token
- 429: Przekroczono limit zapytań (100/min)

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Zwaliduj front, back przez Zod
3. Rozpocznij transakcję w bazie danych
   3.1. Wywołaj FlashcardService.createFlashcard()
   3.2. Jeśli jest generation_metadata:
        - Wywołaj GenerationLogService.createAcceptanceLog()
        - Określ status: 'accepted' lub 'accepted_with_edit'
   3.3. Zatwierdź transakcję
4. Zwróć utworzoną fiszkę
```

**Implementacja**:

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse and validate
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = createFlashcardSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Create flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.createFlashcard(user.id, validation.data);

    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to create flashcard", 500);
  }
};
```

---

### 5.3. GET /api/flashcards

**Plik**: `src/pages/api/flashcards/index.ts`

**Opis**: Pobiera listę fiszek z paginacją i wyszukiwaniem.

**Request**:

```typescript
GET /api/flashcards?page=1&limit=20&search=query
Headers: {
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (200 OK)**:

```typescript
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "due_date": "2025-10-18T12:00:00Z",
      "stability": 1.5,
      "difficulty": 5.2,
      "review_history": [...],
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Kody błędów**:

- 400: Nieprawidłowe parametry paginacji
- 401: Brak lub nieprawidłowy token

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Parsuj query params (page, limit, search)
3. Zwaliduj parametry przez Zod
4. Wywołaj FlashcardService.listFlashcards()
   4.1. Zapytanie z filtrem user_id (RLS)
   4.2. Jeśli search: dodaj ILIKE filter
   4.3. Zastosuj ORDER BY created_at DESC
   4.4. Zastosuj LIMIT i OFFSET
   4.5. Policz total records
5. Zwróć dane z metadanymi paginacji
```

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ request, locals, url }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse query params
  const query = {
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    search: url.searchParams.get("search") || undefined,
  };

  // 3. Validate
  const validation = listFlashcardsSchema.safeParse(query);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, validation.error.flatten());
  }

  // 4. List flashcards
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const result = await flashcardService.listFlashcards(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to list flashcards", 500);
  }
};
```

---

### 5.4. GET /api/flashcards/:id

**Plik**: `src/pages/api/flashcards/[id].ts`

**Opis**: Pobiera pojedynczą fiszkę.

**Request**:

```typescript
GET /api/flashcards/:id
Headers: {
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (200 OK)**:

```typescript
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": 1.5,
  "difficulty": 5.2,
  "review_history": [...],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Kody błędów**:

- 400: Nieprawidłowy format UUID
- 401: Brak lub nieprawidłowy token
- 404: Fiszka nie znaleziona

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Wyciągnij ID z params i zwaliduj UUID
3. Wywołaj FlashcardService.getFlashcard()
4. Jeśli null: zwróć 404
5. Zwróć fiszkę
```

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ params, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Get flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.getFlashcard(user.id, idValidation.data);

    if (!flashcard) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to get flashcard", 500);
  }
};
```

---

### 5.5. PATCH /api/flashcards/:id

**Plik**: `src/pages/api/flashcards/[id].ts`

**Opis**: Aktualizuje fiszkę.

**Request**:

```typescript
PATCH /api/flashcards/:id
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
Body: {
  "front"?: "string (max 200 chars)",
  "back"?: "string (max 500 chars)"
}
```

**Response (200 OK)**:

```typescript
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": 1.5,
  "difficulty": 5.2,
  "review_history": [...],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:30:00Z"
}
```

**Kody błędów**:

- 400: Nieprawidłowe dane lub UUID
- 401: Brak lub nieprawidłowy token
- 404: Fiszka nie znaleziona

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Wyciągnij ID z params i zwaliduj UUID
3. Parsuj body i zwaliduj przez Zod
4. Wywołaj FlashcardService.updateFlashcard()
5. Jeśli null: zwróć 404
6. Zwróć zaktualizowaną fiszkę
```

**Implementacja**:

```typescript
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = updateFlashcardSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 4. Update flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const flashcard = await flashcardService.updateFlashcard(user.id, idValidation.data, validation.data);

    if (!flashcard) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to update flashcard", 500);
  }
};
```

---

### 5.6. DELETE /api/flashcards/:id

**Plik**: `src/pages/api/flashcards/[id].ts`

**Opis**: Usuwa fiszkę.

**Request**:

```typescript
DELETE /api/flashcards/:id
Headers: {
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (204 No Content)**:

```
(brak body)
```

**Kody błędów**:

- 400: Nieprawidłowy format UUID
- 401: Brak lub nieprawidłowy token
- 404: Fiszka nie znaleziona

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Wyciągnij ID z params i zwaliduj UUID
3. Wywołaj FlashcardService.deleteFlashcard()
4. Jeśli false: zwróć 404
5. Zwróć 204 No Content
```

**Implementacja**:

```typescript
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Validate ID
  const idValidation = uuidSchema.safeParse(params.id);
  if (!idValidation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid flashcard ID format", 400);
  }

  // 3. Delete flashcard
  try {
    const flashcardService = new FlashcardService(locals.supabase);
    const deleted = await flashcardService.deleteFlashcard(user.id, idValidation.data);

    if (!deleted) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to delete flashcard", 500);
  }
};
```

---

### 5.7. POST /api/generation-logs

**Plik**: `src/pages/api/generation-logs/index.ts`

**Opis**: Tworzy log dla odrzuconego kandydata AI.

**Request**:

```typescript
POST /api/generation-logs
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
Body: {
  "status": "rejected",
  "original_front": "string",
  "original_back": "string"
}
```

**Response (201 Created)**:

```typescript
{
  "id": "uuid",
  "user_id": "uuid",
  "flashcard_id": null,
  "status": "rejected",
  "original_front": "string",
  "original_back": "string",
  "created_at": "2025-10-18T12:00:00Z"
}
```

**Kody błędów**:

- 400: Nieprawidłowe dane (status musi być 'rejected')
- 401: Brak lub nieprawidłowy token

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Parsuj body i zwaliduj przez Zod
3. Wywołaj GenerationLogService.createRejectionLog()
4. Zwróć utworzony log
```

**Implementacja**:

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse and validate
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = createGenerationLogSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Create log
  try {
    const logService = new GenerationLogService(locals.supabase);
    const log = await logService.createRejectionLog(user.id, validation.data);

    return new Response(JSON.stringify(log), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to create generation log", 500);
  }
};
```

---

### 5.8. GET /api/study/due

**Plik**: `src/pages/api/study/due.ts`

**Opis**: Pobiera fiszki do powtórki.

**Request**:

```typescript
GET /api/study/due?limit=20
Headers: {
  "Authorization": "Bearer <jwt_token>"
}
```

**Response (200 OK)**:

```typescript
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "string",
      "back": "string",
      "due_date": "2025-10-18T12:00:00Z",
      "stability": 1.5,
      "difficulty": 5.2,
      "review_history": [...],
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:00:00Z"
    }
  ],
  "total_due": 45
}
```

**Kody błędów**:

- 400: Nieprawidłowy parametr limit
- 401: Brak lub nieprawidłowy token

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Parsuj query param limit
3. Zwaliduj przez Zod
4. Wywołaj StudyService.getDueFlashcards()
   4.1. Zapytanie: WHERE user_id = X AND due_date <= now()
   4.2. ORDER BY due_date ASC
   4.3. LIMIT
   4.4. Policz total_due bez limitu
5. Zwróć fiszki i total_due
```

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ url, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse query params
  const query = {
    limit: url.searchParams.get("limit"),
  };

  // 3. Validate
  const validation = getDueFlashcardsSchema.safeParse(query);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, validation.error.flatten());
  }

  // 4. Get due flashcards
  try {
    const studyService = new StudyService(locals.supabase);
    const result = await studyService.getDueFlashcards(user.id, validation.data.limit);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse("INTERNAL_ERROR", "Failed to get due flashcards", 500);
  }
};
```

---

### 5.9. POST /api/study/review

**Plik**: `src/pages/api/study/review.ts`

**Opis**: Przetwarza recenzję fiszki i aktualizuje parametry FSRS.

**Request**:

```typescript
POST /api/study/review
Headers: {
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
Body: {
  "flashcard_id": "uuid",
  "rating": 1-4
}
```

**Response (200 OK)**:

```typescript
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "string",
  "back": "string",
  "due_date": "2025-10-20T15:30:00Z",
  "stability": 2.3,
  "difficulty": 4.8,
  "review_history": [
    {
      "date": "2025-10-18T12:00:00Z",
      "rating": 3
    }
  ],
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

**Kody błędów**:

- 400: Nieprawidłowy UUID lub rating
- 401: Brak lub nieprawidłowy token
- 404: Fiszka nie znaleziona

**Przepływ danych**:

```
1. Wyciągnij JWT i zwaliduj użytkownika
2. Parsuj body i zwaliduj przez Zod
3. Wywołaj StudyService.submitReview()
   3.1. Pobierz fiszkę
   3.2. Jeśli nie znaleziono: zwróć 404
   3.3. Oblicz nowe parametry FSRS
   3.4. Aktualizuj review_history
   3.5. Zapisz zmiany
4. Zwróć zaktualizowaną fiszkę
```

**Implementacja**:

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Authentication
  const user = await extractUser(locals.supabase);
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 2. Parse and validate
  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const validation = submitReviewSchema.safeParse(body);
  if (!validation.success) {
    return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, validation.error.flatten());
  }

  // 3. Submit review
  try {
    const studyService = new StudyService(locals.supabase);
    const flashcard = await studyService.submitReview(user.id, validation.data.flashcard_id, validation.data.rating);

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("NOT_FOUND", "Flashcard not found", 404);
    }

    return createErrorResponse("INTERNAL_ERROR", "Failed to submit review", 500);
  }
};
```

---

## 6. Obsługa błędów

### 6.1. Standardowy format błędu

**Lokalizacja**: `src/lib/utils/error.ts`

```typescript
import type { ApiErrorCode, ApiErrorResponseDTO } from "@/types";

/**
 * Tworzy standardową odpowiedź błędu
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, any>
): Response {
  const body: ApiErrorResponseDTO = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

### 6.2. Custom Error Classes

```typescript
/**
 * Błąd generacji AI
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public errorId: string
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

/**
 * Timeout generacji AI
 */
export class AITimeoutError extends Error {
  constructor(message: string = "AI service timeout") {
    super(message);
    this.name = "AITimeoutError";
  }
}

/**
 * Zasób nie znaleziony
 */
export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
```

### 6.3. Mapowanie kodów błędów

| HTTP Status | Error Code           | Opis                         | Użycie          |
| ----------- | -------------------- | ---------------------------- | --------------- |
| 400         | VALIDATION_ERROR     | Nieprawidłowe dane wejściowe | Walidacja Zod   |
| 401         | UNAUTHORIZED         | Brak lub nieprawidłowy token | Auth middleware |
| 404         | NOT_FOUND            | Zasób nie znaleziony         | CRUD operations |
| 429         | RATE_LIMIT_EXCEEDED  | Przekroczono limit           | Rate limiter    |
| 500         | AI_GENERATION_FAILED | Błąd usługi AI               | AI service      |
| 504         | AI_TIMEOUT           | Timeout usługi AI            | AI service      |
| 500         | INTERNAL_ERROR       | Nieoczekiwany błąd           | Catch-all       |

---

## 7. Bezpieczeństwo

### 7.1. Uwierzytelnianie (Authentication)

**Lokalizacja**: `src/lib/utils/auth.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Wyciąga i weryfikuje użytkownika z JWT
 * @param supabase - Supabase client z locals
 * @returns User object lub null jeśli nieautoryzowany
 */
export async function extractUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
```

**Użycie w middleware** (`src/middleware/index.ts`):

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "@/db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Wyciągnij token z nagłówka Authorization
  const authHeader = context.request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  // Utwórz Supabase client z tokenem użytkownika
  if (token) {
    context.locals.supabase = supabaseClient.auth.setAuth(token);
  } else {
    context.locals.supabase = supabaseClient;
  }

  return next();
});
```

### 7.2. Autoryzacja (Row-Level Security)

**RLS Policies** (już zaimplementowane w bazie danych):

```sql
-- Fiszki: użytkownicy mogą zarządzać tylko swoimi
CREATE POLICY "Users can manage their own flashcards."
ON flashcards FOR ALL
USING (auth.uid() = user_id);

-- Logi generacji: użytkownicy mogą przeglądać i tworzyć tylko swoje
CREATE POLICY "Users can view and create their own generation logs."
ON generation_logs FOR ALL
USING (auth.uid() = user_id);

-- Logi błędów: użytkownicy mogą zarządzać tylko swoimi
CREATE POLICY "Users can manage their own generation error logs."
ON generation_error_logs FOR ALL
USING (auth.uid() = user_id);
```

**Kluczowe zasady**:

- Wszystkie zapytania do bazy danych automatycznie filtrowane przez RLS
- Nie trzeba ręcznie dodawać `WHERE user_id = X` w zapytaniach
- Próby dostępu do cudzych danych zwracają puste wyniki

### 7.3. Walidacja danych wejściowych

**Zasady**:

1. **Waliduj wszystko**: Nigdy nie ufaj danym wejściowym
2. **Waliduj na backendzie**: Nawet jeśli frontend waliduje
3. **Używaj Zod**: Spójne schematy walidacji
4. **Waliduj typy**: UUID, liczby, stringi, enumy
5. **Waliduj długości**: Zgodnie z ograniczeniami bazy danych

**Przykład**:

```typescript
// Walidacja UUID
const idValidation = uuidSchema.safeParse(params.id);
if (!idValidation.success) {
  return createErrorResponse("VALIDATION_ERROR", "Invalid UUID format", 400);
}

// Walidacja długości tekstu
const flashcardValidation = createFlashcardSchema.safeParse(body);
if (!flashcardValidation.success) {
  return createErrorResponse("VALIDATION_ERROR", "Invalid input", 400, flashcardValidation.error.flatten());
}
```

### 7.4. Sanityzacja błędów

**Zasady**:

1. **Nie eksponuj szczegółów wewnętrznych**: Stack traces, database errors
2. **Używaj generycznych komunikatów**: "An error occurred" zamiast szczegółów
3. **Loguj szczegóły po stronie serwera**: Dla debugowania
4. **Zwracaj error_id**: Dla korelacji z logami

**Przykład**:

```typescript
try {
  // ... operacja
} catch (error) {
  // Loguj szczegóły po stronie serwera
  console.error("Detailed error:", error);

  // Zwróć generyczny komunikat użytkownikowi
  return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
```

### 7.5. Ochrona przed atakami

| Atak          | Ochrona               | Implementacja           |
| ------------- | --------------------- | ----------------------- |
| SQL Injection | Parameterized queries | Supabase client         |
| XSS           | Sanityzacja inputu    | Zod validation          |
| CSRF          | SameSite cookies      | Supabase Auth           |
| Rate limiting | Throttling            | Rate limiter middleware |
| Brute force   | Rate limiting         | Rate limiter middleware |
| Token theft   | HTTPS only            | Deployment config       |

---

## 8. Rate Limiting

### 8.1. Lokalizacja: `src/lib/utils/rate-limit.ts`

**Strategia**: In-memory rate limiter z użyciem Map

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Sprawdza czy użytkownik przekroczył limit zapytań
 * @param userId - ID użytkownika
 * @param limit - Maksymalna liczba zapytań
 * @param windowMs - Okno czasowe w ms (domyślnie 60000 = 1 minuta)
 * @returns true jeśli przekroczono limit
 */
export function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number = 60000
): { exceeded: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${userId}`;

  const entry = rateLimitStore.get(key);

  // Jeśli brak wpisu lub okno wygasło, zresetuj
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { exceeded: false };
  }

  // Jeśli przekroczono limit
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { exceeded: true, retryAfter };
  }

  // Inkrementuj licznik
  entry.count++;
  rateLimitStore.set(key, entry);

  return { exceeded: false };
}

/**
 * Czyści wygasłe wpisy (wywołaj okresowo)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup co 5 minut
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
```

### 8.2. Limity dla endpointów

| Endpoint                      | Limit   | Okno czasowe |
| ----------------------------- | ------- | ------------ |
| POST /api/flashcards/generate | 10 req  | 1 minuta     |
| Wszystkie inne                | 100 req | 1 minuta     |

### 8.3. Użycie w middleware

```typescript
// src/middleware/index.ts
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createErrorResponse } from "@/lib/utils/error";

export const onRequest = defineMiddleware(async (context, next) => {
  // ... auth logic ...

  // Rate limiting dla API routes
  if (context.url.pathname.startsWith("/api/")) {
    const user = await extractUser(context.locals.supabase);

    if (user) {
      // Określ limit na podstawie endpointu
      const limit = context.url.pathname.includes("/generate") ? 10 : 100;

      const rateLimitResult = checkRateLimit(user.id, limit);

      if (rateLimitResult.exceeded) {
        return createErrorResponse("RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", 429, {
          retry_after: rateLimitResult.retryAfter,
        });
      }
    }
  }

  return next();
});
```

### 8.4. Response headers

Dodaj nagłówki rate limit do odpowiedzi:

```typescript
// W każdym endpoincie
const headers = {
  "Content-Type": "application/json",
  "X-RateLimit-Limit": limit.toString(),
  "X-RateLimit-Remaining": (limit - currentCount).toString(),
  "X-RateLimit-Reset": resetTimestamp.toString(),
};
```

---

## 9. Kroki implementacji

### Faza 1: Przygotowanie infrastruktury (1-2 dni)

#### 1.1. Setup środowiska

- [ ] Zainstaluj zależności: `zod`, `ts-fsrs`, `@supabase/supabase-js`
- [ ] Skonfiguruj zmienne środowiskowe w `.env`:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_KEY=xxx
  OPENROUTER_API_KEY=xxx
  ```
- [ ] Zweryfikuj połączenie z Supabase
- [ ] Zweryfikuj połączenie z OpenRouter

#### 1.2. Struktura katalogów

- [ ] Utwórz `src/lib/services/`
- [ ] Utwórz `src/lib/validation/`
- [ ] Utwórz `src/lib/utils/`
- [ ] Utwórz `src/pages/api/flashcards/`
- [ ] Utwórz `src/pages/api/generation-logs/`
- [ ] Utwórz `src/pages/api/study/`

#### 1.3. Typy i walidacja

- [ ] Zaimplementuj `src/lib/validation/schemas.ts` (wszystkie schematy Zod)
- [ ] Zweryfikuj zgodność z `src/types.ts`

### Faza 2: Utilities i helpers (1 dzień)

#### 2.1. Authentication utilities

- [ ] Zaimplementuj `src/lib/utils/auth.ts`
  - [ ] Funkcja `extractUser()`
  - [ ] Testy jednostkowe

#### 2.2. Error handling utilities

- [ ] Zaimplementuj `src/lib/utils/error.ts`
  - [ ] Funkcja `createErrorResponse()`
  - [ ] Custom error classes: `AIGenerationError`, `AITimeoutError`, `NotFoundError`
  - [ ] Testy jednostkowe

#### 2.3. Rate limiting utilities

- [ ] Zaimplementuj `src/lib/utils/rate-limit.ts`
  - [ ] Funkcja `checkRateLimit()`
  - [ ] Funkcja `cleanupRateLimitStore()`
  - [ ] Testy jednostkowe

#### 2.4. Constants

- [ ] Utwórz `src/lib/constants.ts`

  ```typescript
  export const RATE_LIMITS = {
    GENERATION: 10,
    DEFAULT: 100,
  };

  export const VALIDATION_LIMITS = {
    SOURCE_TEXT_MIN: 1000,
    SOURCE_TEXT_MAX: 10000,
    FLASHCARD_FRONT_MAX: 200,
    FLASHCARD_BACK_MAX: 500,
  };

  export const AI_CONFIG = {
    MODEL: "openai/gpt-4",
    TIMEOUT_MS: 60000,
  };
  ```

### Faza 3: Services Layer (3-4 dni)

#### 3.1. Error Log Service

- [ ] Zaimplementuj `src/lib/services/error-log.service.ts`
  - [ ] Metoda `logGenerationError()`
  - [ ] Metoda `hashSourceText()`
  - [ ] Testy jednostkowe

#### 3.2. AI Generation Service

- [ ] Zaimplementuj `src/lib/services/ai-generation.service.ts`
  - [ ] Metoda `generateFlashcards()`
  - [ ] Metoda `createPrompt()`
  - [ ] Metoda `parseAIResponse()`
  - [ ] Metoda `validateCandidates()`
  - [ ] Integracja z OpenRouter API
  - [ ] Obsługa timeout (60s)
  - [ ] Logowanie błędów przez ErrorLogService
  - [ ] Testy jednostkowe
  - [ ] Testy integracyjne z mock API

#### 3.3. Generation Log Service

- [ ] Zaimplementuj `src/lib/services/generation-log.service.ts`
  - [ ] Metoda `createRejectionLog()`
  - [ ] Metoda `createAcceptanceLog()`
  - [ ] Metoda `determineStatus()`
  - [ ] Testy jednostkowe

#### 3.4. Flashcard Service

- [ ] Zaimplementuj `src/lib/services/flashcard.service.ts`
  - [ ] Metoda `createFlashcard()`
    - [ ] Integracja z GenerationLogService dla generation_metadata
    - [ ] Transakcja bazy danych
  - [ ] Metoda `listFlashcards()`
    - [ ] Paginacja
    - [ ] Wyszukiwanie (ILIKE)
  - [ ] Metoda `getFlashcard()`
  - [ ] Metoda `updateFlashcard()`
  - [ ] Metoda `deleteFlashcard()`
  - [ ] Testy jednostkowe
  - [ ] Testy integracyjne z testową bazą danych

#### 3.5. Study Service

- [ ] Zaimplementuj `src/lib/services/study.service.ts`
  - [ ] Metoda `getDueFlashcards()`
  - [ ] Metoda `submitReview()`
  - [ ] Metoda `calculateFSRSParameters()`
    - [ ] Integracja z biblioteką ts-fsrs
    - [ ] Mapowanie ratingu (1-4 → 0-3)
  - [ ] Metoda `updateReviewHistory()`
  - [ ] Testy jednostkowe
  - [ ] Testy integracyjne z ts-fsrs

### Faza 4: Middleware (1 dzień)

#### 4.1. Astro Middleware

- [ ] Zaimplementuj `src/middleware/index.ts`
  - [ ] Inicjalizacja Supabase client z JWT
  - [ ] Rate limiting dla API routes
  - [ ] Logowanie requestów (opcjonalne)
  - [ ] Testy integracyjne

### Faza 5: API Endpoints (4-5 dni)

#### 5.1. Flashcard Generation

- [ ] Zaimplementuj `src/pages/api/flashcards/generate.ts`
  - [ ] Handler POST
  - [ ] Authentication
  - [ ] Walidacja input (Zod)
  - [ ] Wywołanie AIGenerationService
  - [ ] Obsługa błędów (400, 401, 429, 500, 504)
  - [ ] Testy E2E

#### 5.2. Flashcard CRUD

- [ ] Zaimplementuj `src/pages/api/flashcards/index.ts`
  - [ ] Handler POST (create)
    - [ ] Authentication
    - [ ] Walidacja input
    - [ ] Wywołanie FlashcardService
    - [ ] Obsługa generation_metadata
    - [ ] Obsługa błędów
    - [ ] Testy E2E
  - [ ] Handler GET (list)
    - [ ] Authentication
    - [ ] Walidacja query params
    - [ ] Wywołanie FlashcardService
    - [ ] Obsługa błędów
    - [ ] Testy E2E

- [ ] Zaimplementuj `src/pages/api/flashcards/[id].ts`
  - [ ] Handler GET (single)
    - [ ] Authentication
    - [ ] Walidacja UUID
    - [ ] Wywołanie FlashcardService
    - [ ] Obsługa błędów (404)
    - [ ] Testy E2E
  - [ ] Handler PATCH (update)
    - [ ] Authentication
    - [ ] Walidacja UUID i input
    - [ ] Wywołanie FlashcardService
    - [ ] Obsługa błędów (404)
    - [ ] Testy E2E
  - [ ] Handler DELETE
    - [ ] Authentication
    - [ ] Walidacja UUID
    - [ ] Wywołanie FlashcardService
    - [ ] Obsługa błędów (404)
    - [ ] Testy E2E

#### 5.3. Generation Logs

- [ ] Zaimplementuj `src/pages/api/generation-logs/index.ts`
  - [ ] Handler POST
  - [ ] Authentication
  - [ ] Walidacja input (status='rejected')
  - [ ] Wywołanie GenerationLogService
  - [ ] Obsługa błędów
  - [ ] Testy E2E

#### 5.4. Study Session

- [ ] Zaimplementuj `src/pages/api/study/due.ts`
  - [ ] Handler GET
  - [ ] Authentication
  - [ ] Walidacja query params
  - [ ] Wywołanie StudyService
  - [ ] Obsługa błędów
  - [ ] Testy E2E

- [ ] Zaimplementuj `src/pages/api/study/review.ts`
  - [ ] Handler POST
  - [ ] Authentication
  - [ ] Walidacja input (flashcard_id, rating)
  - [ ] Wywołanie StudyService
  - [ ] Obsługa błędów (404)
  - [ ] Testy E2E

### Faza 6: Testing i dokumentacja (2-3 dni)

#### 6.1. Testy jednostkowe

- [ ] Wszystkie serwisy mają testy jednostkowe
- [ ] Wszystkie utilities mają testy jednostkowe
- [ ] Coverage > 80%

#### 6.2. Testy integracyjne

- [ ] Testy z testową bazą danych Supabase
- [ ] Testy z mock OpenRouter API
- [ ] Testy FSRS calculations

#### 6.3. Testy E2E

- [ ] Wszystkie endpointy mają testy E2E
- [ ] Testy scenariuszy użytkownika:
  - [ ] Generowanie fiszek → akceptacja → nauka
  - [ ] Generowanie fiszek → edycja → akceptacja
  - [ ] Generowanie fiszek → odrzucenie
  - [ ] Ręczne tworzenie fiszek
  - [ ] Wyszukiwanie fiszek
  - [ ] Sesja nauki (due flashcards → review)

#### 6.4. Dokumentacja

- [ ] API documentation (OpenAPI/Swagger - opcjonalne)
- [ ] README z instrukcjami setup
- [ ] Komentarze w kodzie (JSDoc)
- [ ] Przykłady użycia API (Postman collection - opcjonalne)

### Faza 7: Deployment i monitoring (1-2 dni)

#### 7.1. Deployment

- [ ] Skonfiguruj zmienne środowiskowe na produkcji
- [ ] Deploy na DigitalOcean (Docker)
- [ ] Zweryfikuj połączenia (Supabase, OpenRouter)
- [ ] Smoke tests na produkcji

#### 7.2. Monitoring

- [ ] Logowanie błędów (Sentry - opcjonalne)
- [ ] Monitoring wydajności (opcjonalne)
- [ ] Alerty dla błędów krytycznych (opcjonalne)

### Faza 8: Optymalizacja (ciągła)

#### 8.1. Performance

- [ ] Optymalizacja zapytań do bazy danych
- [ ] Caching (jeśli potrzebne)
- [ ] Indeksy w bazie danych (już zdefiniowane w db-plan.md)

#### 8.2. Security audit

- [ ] Review RLS policies
- [ ] Review rate limiting
- [ ] Review error sanitization
- [ ] Penetration testing (opcjonalne)

---

## 10. Checklist przed wdrożeniem

### Bezpieczeństwo

- [ ] Wszystkie endpointy wymagają autentykacji
- [ ] RLS policies włączone na wszystkich tabelach
- [ ] Walidacja wszystkich inputów przez Zod
- [ ] Sanityzacja komunikatów błędów
- [ ] Rate limiting zaimplementowany
- [ ] HTTPS wymuszony na produkcji
- [ ] Zmienne środowiskowe zabezpieczone

### Funkcjonalność

- [ ] Wszystkie endpointy zwracają poprawne kody statusu
- [ ] Wszystkie endpointy zwracają poprawny format JSON
- [ ] Paginacja działa poprawnie
- [ ] Wyszukiwanie działa poprawnie
- [ ] FSRS algorithm działa poprawnie
- [ ] AI generation działa poprawnie
- [ ] Logowanie błędów działa poprawnie

### Testy

- [ ] Testy jednostkowe przechodzą (coverage > 80%)
- [ ] Testy integracyjne przechodzą
- [ ] Testy E2E przechodzą
- [ ] Smoke tests na produkcji przechodzą

### Dokumentacja

- [ ] README zaktualizowany
- [ ] API documentation dostępna
- [ ] Komentarze w kodzie aktualne
- [ ] Przykłady użycia dostępne

### Performance

- [ ] Indeksy w bazie danych utworzone
- [ ] Zapytania zoptymalizowane
- [ ] Rate limiting nie blokuje normalnego użycia
- [ ] AI generation timeout ustawiony (60s)

---

## 11. Potencjalne problemy i rozwiązania

### Problem 1: AI Generation Timeout

**Symptom**: Użytkownicy otrzymują 504 Gateway Timeout

**Rozwiązania**:

1. Zwiększ timeout do 90s
2. Dodaj retry logic (max 2 próby)
3. Użyj szybszego modelu AI
4. Przenieś generację do background job (queue)

### Problem 2: Rate Limiting zbyt restrykcyjne

**Symptom**: Użytkownicy często otrzymują 429

**Rozwiązania**:

1. Zwiększ limity (np. 20 req/min dla generation)
2. Użyj sliding window zamiast fixed window
3. Zaimplementuj tier-based limiting (premium users = wyższe limity)

### Problem 3: Wolne zapytania do bazy danych

**Symptom**: Endpointy odpowiadają wolno (>1s)

**Rozwiązania**:

1. Sprawdź czy indeksy są utworzone
2. Użyj `EXPLAIN ANALYZE` do analizy zapytań
3. Dodaj caching (Redis) dla często używanych danych
4. Zoptymalizuj zapytania (unikaj N+1)

### Problem 4: In-memory rate limiter nie działa w multi-instance deployment

**Symptom**: Rate limiting nie działa poprawnie gdy jest wiele instancji aplikacji

**Rozwiązania**:

1. Użyj Redis do przechowywania rate limit counters
2. Użyj Supabase Realtime do synchronizacji
3. Użyj zewnętrznej usługi rate limiting (Cloudflare, AWS API Gateway)

### Problem 5: FSRS calculations niepoprawne

**Symptom**: Due dates są nieprawidłowe, fiszki pojawiają się zbyt często/rzadko

**Rozwiązania**:

1. Zweryfikuj mapowanie ratingu (1-4 → 0-3)
2. Sprawdź czy stability i difficulty są poprawnie inicjalizowane
3. Zweryfikuj czy review_history jest poprawnie aktualizowana
4. Użyj domyślnych parametrów FSRS (nie customizuj na początku)

---

## 12. Metryki sukcesu

### Performance Metrics

- **Response time**: < 500ms dla 95% requestów (bez AI generation)
- **AI generation time**: < 30s dla 95% requestów
- **Database query time**: < 100ms dla 95% zapytań
- **Uptime**: > 99.9%

### Quality Metrics

- **Test coverage**: > 80%
- **Bug rate**: < 1 bug per 1000 requests
- **Error rate**: < 0.1% (bez 4xx)

### User Experience Metrics

- **API error rate**: < 1%
- **Rate limit hit rate**: < 5% użytkowników
- **AI generation success rate**: > 95%

---

## 13. Maintenance Plan

### Codziennie

- [ ] Sprawdź logi błędów
- [ ] Sprawdź metryki wydajności
- [ ] Sprawdź rate limit violations

### Co tydzień

- [ ] Review security logs
- [ ] Update dependencies (jeśli są security patches)
- [ ] Backup bazy danych

### Co miesiąc

- [ ] Review i optymalizacja zapytań do bazy danych
- [ ] Review i aktualizacja dokumentacji
- [ ] Security audit
- [ ] Update dependencies (minor versions)

### Co kwartał

- [ ] Major dependencies update
- [ ] Performance optimization sprint
- [ ] User feedback review i implementacja ulepszeń

---

## Podsumowanie

Ten plan implementacji zapewnia kompleksowe wytyczne dla zespołu programistów do wdrożenia REST API dla 10xCards. Plan obejmuje:

1. **Architekturę warstwową** z wyraźnym podziałem odpowiedzialności
2. **Bezpieczeństwo** jako priorytet (auth, RLS, validation, rate limiting)
3. **Testowalność** z jasno określonymi strategiami testowania
4. **Skalowalność** z możliwością łatwego rozszerzania
5. **Maintainability** z czystym kodem i dokumentacją

Szacowany czas implementacji: **14-18 dni roboczych** dla zespołu 2-3 programistów.

**Następne kroki**:

1. Review planu z zespołem
2. Przydzielenie zadań
3. Setup środowiska deweloperskiego
4. Rozpoczęcie implementacji od Fazy 1
