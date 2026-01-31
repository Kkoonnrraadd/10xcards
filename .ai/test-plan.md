Skanuję repo, żeby zrozumieć strukturę, punkty integracji (Astro, Supabase, middleware, API) i istniejące pliki konfiguracyjne – potem przygotuję dopasowany plan testów.

[5 tools called]

Przeczytam kluczowe pliki (`package.json`, konfiguracje, middleware, schematy walidacji, utils, serwisy, endpointy API i wybrane widoki) równolegle, żeby dopasować plan testów do realnych przepływów (auth, rate limiting, generowanie AI, CRUD fiszek, nauka/FSRS).

[12 tools called]

Zebrałem już kluczowe pliki API, serwisy i middleware. Teraz równolegle odczytam brakujące endpointy, klienta Supabase, stałe, typy i serwisy logów, żeby precyzyjnie zmapować scenariusze testowe i zależności (AI/OpenRouter, RLS, FSRS).

[13 tools called]

## <plan_testów>

### 1. Wprowadzenie i cele testowania

- Celem jest zapewnienie jakości aplikacji 10xCards opartej na Astro 5, TypeScript 5, React 19, Tailwind 4, shadcn/ui oraz Supabase (Auth, PostgreSQL, RLS) z integracją AI (OpenRouter).
- Główne obszary: poprawność i odporność API (`/src/pages/api/**`), bezpieczeństwo (Auth + RLS), stabilność integracji AI, poprawność algorytmu nauki (FSRS – obecnie mock), użyteczność i dostępność UI, wydajność oraz limity zapytań.
- Cel dodatkowy: wczesne wykrywanie regresji poprzez automatyzację testów i integrację z CI.

### 2. Zakres testów

- Backend/SSR:
  - Middleware `src/middleware/index.ts` (ochrona tras, rate limiting).
  - Endpoints API:
    - `src/pages/api/flashcards/index.ts` (GET/POST)
    - `src/pages/api/flashcards/[id].ts` (GET/PATCH/DELETE)
    - `src/pages/api/flashcards/generate.ts` (POST)
    - `src/pages/api/generation-logs/index.ts` (POST)
    - `src/pages/api/study/due.ts` (GET)
    - `src/pages/api/study/review.ts` (POST)
  - Serwisy:
    - `AIGenerationService`, `OpenRouterService`, `FlashcardService`, `StudyService`, `GenerationLogService`, `ErrorLogService`
  - Utils i walidacja: `schemas.ts` (Zod), `error.ts`, `rate-limit.ts`, `auth.ts`, `constants.ts`
  - Supabase SSR/Browser: `src/db/supabase.client.ts` (cookies, sesje)
- Frontend:
  - Strony Astro: `login.astro`, `register.astro`, `dashboard.astro`, `account.astro`, reset/zmiana hasła
  - Komponenty React: formularze auth i dashboard (generator/reviewer)
- Infrastruktura:
  - Konfiguracja `astro.config.mjs`, skrypty `package.json`, środowiska i zmienne `.env(.test)`

Nie wchodzą w zakres: testy wizualne piksel‑perfect, testy kompatybilności przeglądarek legacy (IE/Edge Legacy).

### 3. Typy testów

- Testy jednostkowe (Vitest):
  - Walidacja Zod (`schemas.ts`): ścieżki sukcesu i błędów (min/max, literal, union).
  - Utils: `createErrorResponse`, klasy błędów, `checkRateLimit` (okno czasowe, reset, retryAfter), `extractUser`.
  - Serwisy z mockami: `AIGenerationService` (timeout → 504, błędy → `AIGenerationError` z `errorId`), `OpenRouterService` (błędy → `OpenRouterError`), `FlashcardService` (CRUD z mockowanym Supabase), `GenerationLogService`, `ErrorLogService`, `StudyService` (mock FSRS).
- Testy integracyjne API (supertest/undici + Astro node adapter):
  - Pełne żądanie/odpowiedź z realnym middleware (auth/rate limit), z mockiem Supabase i MSW do OpenRouter.
  - Kody błędów i format DTO (`ApiErrorResponseDTO`).
- Testy kontraktowe:
  - JSON schema odpowiedzi OpenRouter (strict `json_schema`); walidacja struktury kandydatów.
- Testy E2E (Playwright):
  - Flow użytkownika: rejestracja/logowanie (sesje SSR cookies), dashboard, generowanie AI, akceptacja/edycja/odrzucenie kandydatów, powtórki (due + review), wylogowanie, usuwanie konta.
  - Ochrona tras i przekierowania (public vs protected).
- Testy bezpieczeństwa:
  - RLS/IDOR: brak dostępu do cudzych zasobów (różne `user_id`), wymuszanie `:id`.
  - Rate limiting (GENERATION vs DEFAULT z `constants.ts`), próby obejścia.
  - Cookies SSR (`sameSite`, `httpOnly`, `secure`) – poprawność zachowania na http/https.
- Testy wydajnościowe (k6/Artillery):
  - Piki na `/api/flashcards/generate` (timeout, limity), CRUD i listing z paginacją, powtórki.
  - Docelowe SLO dla P95/P99 i błąd 429 w kontroli.
- Testy dostępności (axe/Playwright-axe):
  - Strony auth i dashboard: brak krytycznych błędów a11y, focus management, role/label.
- Testy użyteczności (manualne, heurystyczne):
  - Formularze (walidacje inline), komunikaty błędów, spójność UI (shadcn/ui).

### 4. Scenariusze testowe dla kluczowych funkcjonalności

- Middleware i Auth
  - Wejście na `"/login"` z aktywną sesją → redirect `"/dashboard"`.
  - Wejście na `"/dashboard"` bez sesji → redirect `"/login"`.
  - API z sesją i bez sesji → 200/401 zgodnie z oczekiwaniem.
  - Rate limiting:
    - `/api/flashcards/generate` po N=GENERATION/min → 429 i `retry_after`.
    - Inne `/api/**` po N=DEFAULT/min → 429.
- AI: `POST /api/flashcards/generate`
  - body `source_text` < 1000 → 400 VALIDATION_ERROR.
  - body `source_text` > 10000 → 400 VALIDATION_ERROR.
  - Poprawne żądanie → 200, `candidates` w limitach długości.
  - Timeout modelu → 504 AI_TIMEOUT.
  - Błąd modelu → 500 AI_GENERATION_FAILED + `error_id` z `ErrorLogService`.
- Flashcards CRUD
  - `POST /api/flashcards`:
    - Walidacja `front/back` długości; puste/za długie → 400.
    - Z `generation_metadata` → utworzony rekord + log akceptacji (accepted/accepted_with_edit).
  - `GET /api/flashcards`:
    - Paginacja (page/limit), `search` filtruje `front/back`, poprawne `pagination`.
  - `GET /api/flashcards/:id`:
    - Zły UUID → 400, brak zasobu → 404, nie właściciel → 404 (przez RLS).
  - `PATCH /api/flashcards/:id`:
    - Walidacja partial update; brak zmian też przechodzi tylko jeśli schema pozwala; nieistniejący → 404.
  - `DELETE /api/flashcards/:id`:
    - Nieistniejący → 404; sukces → 204.
- Generation Logs
  - `POST /api/generation-logs`:
    - `status` musi być `"rejected"` → w innym przypadku 400.
    - 201 z poprawnym payloadem; brak sesji → 401.
- Study
  - `GET /api/study/due`:
    - `limit` zakres 1–100, domyślnie 20; lista posortowana po `due_date` (rosnąco); `total_due` poprawny.
  - `POST /api/study/review`:
    - Walidacja `flashcard_id` (UUID) i `rating` ∈ {1,2,3,4}.
    - Brak fiszki lub nie właściciel → 404.
    - Sukces → aktualizacja `stability`, `difficulty`, `due_date`, dopisanie `review_history`.
- Supabase SSR/Browser
  - SSR cookies: ustawianie/odczyt przy zalogowaniu, persist sesji między żądaniami.
  - Brak `Cookie` nagłówka → `locals.user = null`.
- UI (wybrane)
  - Formularze: walidacje (min/max), obsługa błędów z API (mapowanie `ApiErrorResponseDTO`), disabled stany przy ładowaniu.
  - Dashboard: generowanie AI (loading, timeout UI, 429 UI), akceptacja/edycja/odrzucenie; lista fiszek (paginacja, search); przegląd/ocena.

### 5. Środowisko testowe

- Wersje:
  - Node 22.x, Astro 5 (adapter node), TS 5, React 19.
- Baza i backend:
  - Supabase lokalnie: `supabase start`; osobna baza testowa.
  - RLS aktywne: testowe polityki dla tabel `flashcards`, `generation_logs`, `generation_error_logs`, `users`.
- Zmienne środowiskowe (`.env.test`):
  - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY` (dla testów integracyjnych stubowane przez MSW).
- Sieć:
  - Testy integracyjne blokują zewnętrzne wywołania (MSW/`fetch` mock); wybrane smoke testy do prawdziwego OpenRouter uruchamiane rzadko i off-CI.
- Seed danych:
  - Skrypty seed/migrations dla danych użytkowników i przykładowych fiszek.

### 6. Narzędzia do testowania

- Jednostkowe/integracyjne: Vitest, ts-node/ESM (wbudowane w Vitest), supertest/undici fetch, MSW (mock HTTP).
- E2E: Playwright (testy i a11y przez `@axe-core/playwright`).
- Wydajność: k6 lub Artillery.
- Jakość: ESLint 9, Prettier, type-check (`tsc --noEmit`).
- Raportowanie: JUnit/HTML reporters, Playwright Trace Viewer, k6 summary outputs.
- CI: GitHub Actions (matryce: test unit/integration, e2e, lint/type-check; cache node_modules; artefakty raportów).

### 7. Harmonogram testów

- Tydzień 1:
  - Jednostkowe: Zod, utils, `FlashcardService`, `GenerationLogService`, `ErrorLogService`.
  - Integracyjne: CRUD `/api/flashcards`, `/api/generation-logs`.
- Tydzień 2:
  - Integracyjne: `/api/study/due`, `/api/study/review` (mock FSRS).
  - AI: `/api/flashcards/generate` (MSW: sukces, timeout, błąd).
  - Middleware: auth/rate limit (GENERATION, DEFAULT).
- Tydzień 3:
  - E2E: auth + dashboard + generowanie + powtórki; dostępność (axe).
  - Wydajność: k6 – smoke + targeted load (GENERATION, listing, review).
- Tydzień 4:
  - Bezpieczeństwo (RLS/IDOR), twarde granice walidacji, regresje, stabilizacja flakiness.
  - Integracja pełna z CI + progi jakości.

### 8. Kryteria akceptacji testów

- Testy automatyczne:
  - Jednostkowe/integracyjne: ≥ 80% lines/branches dla `src/lib`, `src/pages/api`, `src/middleware`.
  - 100% pokrycia ścieżek błędów dla `createErrorResponse`, `rate-limit`, walidacji Zod.
- E2E:
  - Wszystkie krytyczne ścieżki użytkownika przechodzą (auth → dashboard → AI → akceptacja/odrzucenie → nauka).
  - Brak krytycznych a11y (axe severity “serious/critical” = 0).
- Wydajność:
  - `/api/flashcards/generate`: P95 < 2.5s (przy mocku), prawidłowe 504 dla timeout.
  - CRUD/listing: P95 < 250ms (lokalnie).
  - 429 dla limitów (`constants.ts`) w warunkach przekroczeń.
- Bezpieczeństwo:
  - Brak dostępu do cudzych danych (IDOR) we wszystkich endpointach.
  - Wymuszona autoryzacja na protected routes/API (401/redirect).
- Stabilność:
  - Brak flaky testów w 3 kolejnych przebiegach CI.

### 9. Role i odpowiedzialności

- QA Lead: właściciel planu, priorytety, przeglądy, jakość raportów.
- QA Engineer: implementacja testów, uruchamianie, analiza defektów, a11y.
- Developerzy: wsparcie w testowalności (DI, mocki), poprawki defektów, utrzymanie kontraktów.
- DevOps: konfiguracja CI/CD, sekrety, izolacja środowisk, raporty artefaktów.

### 10. Procedury raportowania błędów

- Zgłoszenie (ticket):
  - Tytuł, środowisko, wersja commit, kroki reprodukcji, oczekiwane vs rzeczywiste, logi (status, body, `error.code`, `details`), zrzuty ekranu/trace.
  - Dla AI: dołącz `error_id` z odpowiedzi `AI_GENERATION_FAILED`.
- Priorytety (P0–P3):
  - P0: krytyczne (bezpieczeństwo/dane/uniemożliwia pracę), P1: duży wpływ, P2: średni, P3: niski.
- Triage:
  - Codziennie: przypisanie, SLA naprawy wg priorytetu.
- Weryfikacja:
  - Re-test + automatyczny test/regresja tam gdzie możliwe.
- Retencja:
  - Raporty testów jako artefakty CI (JUnit/HTML/trace).
