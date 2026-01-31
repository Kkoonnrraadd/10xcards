# Plan schematu bazy danych PostgreSQL dla 10xCards

## 1. Lista tabel

### Typy niestandardowe

- **`generation_status` (ENUM)**
  - Definicja: `CREATE TYPE generation_status AS ENUM ('accepted', 'accepted_with_edit', 'rejected');`
  - Opis: Reprezentuje status recenzji fiszki wygenerowanej przez AI.

### Tabela: `users`

- Opis: Przechowuje publiczne dane profilowe użytkowników. Relacja 1-do-1 z tabelą `auth.users` od Supabase.
- Schemat: `public`

| Nazwa kolumny | Typ danych    | Ograniczenia                                                 | Opis                                                 |
| :------------ | :------------ | :----------------------------------------------------------- | :--------------------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Klucz główny, powiązany z ID użytkownika w Supabase. |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                  | Znacznik czasowy utworzenia profilu.                 |
| `updated_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                  | Znacznik czasowy ostatniej aktualizacji profilu.     |

### Tabela: `flashcards`

- Opis: Przechowuje fiszki utworzone przez użytkowników.
- Schemat: `public`

| Nazwa kolumny    | Typ danych     | Ograniczenia                                              | Opis                                                 |
| :--------------- | :------------- | :-------------------------------------------------------- | :--------------------------------------------------- |
| `id`             | `uuid`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                | Unikalny identyfikator fiszki.                       |
| `user_id`        | `uuid`         | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator użytkownika, do którego należy fiszka. |
| `front`          | `varchar(200)` | `NOT NULL`                                                | Treść przodu fiszki.                                 |
| `back`           | `varchar(500)` | `NOT NULL`                                                | Treść tyłu fiszki.                                   |
| `due_date`       | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                               | Data następnej zaplanowanej powtórki.                |
| `stability`      | `real`         | -                                                         | Parametr "stabilności" w algorytmie FSRS.            |
| `difficulty`     | `real`         | -                                                         | Parametr "trudności" w algorytmie FSRS.              |
| `review_history` | `jsonb`        | -                                                         | Historia powtórek fiszki (np. daty, oceny).          |
| `created_at`     | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                               | Znacznik czasowy utworzenia fiszki.                  |
| `updated_at`     | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                               | Znacznik czasowy ostatniej aktualizacji fiszki.      |

### Tabela: `generation_logs`

- Opis: Loguje interakcje użytkownika z propozycjami fiszek od AI na potrzeby analityki.
- Schemat: `public`

| Nazwa kolumny    | Typ danych          | Ograniczenia                                              | Opis                                                                                  |
| :--------------- | :------------------ | :-------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `id`             | `uuid`              | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                | Unikalny identyfikator logu.                                                          |
| `user_id`        | `uuid`              | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator użytkownika, który dokonał akcji.                                       |
| `flashcard_id`   | `uuid`              | `REFERENCES flashcards(id) ON DELETE SET NULL`            | Opcjonalny identyfikator fiszki, jeśli została zaakceptowana. `NULL` dla odrzuconych. |
| `status`         | `generation_status` | `NOT NULL`                                                | Status recenzji (`accepted`, `accepted_with_edit`, `rejected`).                       |
| `original_front` | `text`              | `NOT NULL`                                                | Oryginalna treść przodu fiszki zaproponowana przez AI.                                |
| `original_back`  | `text`              | `NOT NULL`                                                | Oryginalna treść tyłu fiszki zaproponowana przez AI.                                  |
| `created_at`     | `timestamptz`       | `NOT NULL`, `DEFAULT now()`                               | Znacznik czasowy utworzenia logu.                                                     |

### Tabela: `generation_error_logs`

- Opis: Loguje błędy, które wystąpiły podczas próby generowania fiszek przez AI.
- Schemat: `public`

| Nazwa kolumny        | Typ danych     | Ograniczenia                                              | Opis                                                                 |
| :------------------- | :------------- | :-------------------------------------------------------- | :------------------------------------------------------------------- |
| `id`                 | `uuid`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                | Unikalny identyfikator logu błędu.                                   |
| `user_id`            | `uuid`         | `NOT NULL`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator użytkownika, którego dotyczył błąd.                    |
| `model`              | `varchar`      | `NOT NULL`                                                | Model AI, który był używany podczas nieudanej próby.                 |
| `source_text_hash`   | `varchar`      | `NOT NULL`                                                | Skrót (hash) tekstu źródłowego, aby uniknąć logowania pełnej treści. |
| `source_text_length` | `integer`      | `NOT NULL`                                                | Długość tekstu źródłowego.                                           |
| `error_code`         | `varchar(100)` | `NOT NULL`                                                | Kod błędu (np. z API dostawcy AI).                                   |
| `error_message`      | `text`         | `NOT NULL`                                                | Pełna treść komunikatu o błędzie.                                    |
| `created_at`         | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                               | Znacznik czasowy wystąpienia błędu.                                  |

## 2. Relacje między tabelami

- **`auth.users` (1) --- (1) `profiles`**: Każdy użytkownik ma jeden profil. Klucz obcy `profiles.id` wskazuje na `auth.users.id`.
- **`auth.users` (1) --- (N) `flashcards`**: Użytkownik może mieć wiele fiszek. Klucz obcy `flashcards.user_id` wskazuje na `auth.users.id`.
- **`auth.users` (1) --- (N) `generation_logs`**: Użytkownik może wygenerować wiele logów. Klucz obcy `generation_logs.user_id` wskazuje na `auth.users.id`.
- **`auth.users` (1) --- (N) `generation_error_logs`**: Użytkownik może napotkać wiele błędów generacji. Klucz obcy `generation_error_logs.user_id` wskazuje na `auth.users.id`.
- **`flashcards` (1) --- (N) `generation_logs`**: Jedna fiszka może być powiązana z jednym logiem generacji (gdy jest tworzona przez AI). Relacja jest opcjonalna po stronie logu. Klucz obcy `generation_logs.flashcard_id` wskazuje na `flashcards.id`.

## 3. Indeksy

W celu optymalizacji zapytań, zostaną utworzone następujące indeksy:

- `CREATE INDEX ON flashcards (user_id);`
- `CREATE INDEX ON generation_logs (user_id);`
- `CREATE INDEX ON generation_logs (flashcard_id);`
- `CREATE INDEX ON generation_error_logs (user_id);`

## 4. Zasady PostgreSQL (Row-Level Security)

RLS zostanie włączone dla wszystkich tabel, aby zapewnić, że użytkownicy mają dostęp wyłącznie do swoich danych.

- **Dla tabeli `profiles`:**
  - Użytkownicy mogą odczytywać i modyfikować tylko własny profil.
  - `CREATE POLICY "Users can manage their own profile." ON profiles FOR ALL USING (auth.uid() = id);`

- **Dla tabeli `flashcards`:**
  - Użytkownicy mogą wykonywać wszystkie operacje (SELECT, INSERT, UPDATE, DELETE) tylko na własnych fiszkach.
  - `CREATE POLICY "Users can manage their own flashcards." ON flashcards FOR ALL USING (auth.uid() = user_id);`

- **Dla tabeli `generation_logs`:**
  - Użytkownicy mogą odczytywać i tworzyć logi tylko dla siebie. Modyfikacja i usuwanie nie są przewidziane dla użytkowników końcowych.
  - `CREATE POLICY "Users can view and create their own generation logs." ON generation_logs FOR ALL USING (auth.uid() = user_id);`

- **Dla tabeli `generation_error_logs`:**
  - Użytkownicy mogą odczytywać i tworzyć logi błędów tylko dla siebie.
  - `CREATE POLICY "Users can manage their own generation error logs." ON generation_error_logs FOR ALL USING (auth.uid() = user_id);`

## 5. Dodatkowe uwagi

1.  **Automatyczne aktualizowanie `updated_at`**: Zaleca się utworzenie funkcji i triggera w PostgreSQL, aby automatycznie aktualizować kolumnę `updated_at` przy każdej zmianie wiersza w tabelach `profiles` i `flashcards`.
2.  **Kaskadowe usuwanie**: Użycie `ON DELETE CASCADE` w kluczach obcych `user_id` jest kluczową decyzją projektową. Zapewnia to, że po usunięciu użytkownika z `auth.users`, wszystkie jego dane (profil, fiszki, logi) zostaną automatycznie i trwale usunięte, co jest zgodne z wymaganiem funkcjonalnym US-004.
3.  **Nullable `flashcard_id`**: Kolumna `flashcard_id` w tabeli `generation_logs` jest celowo dopuszczalna jako `NULL`, ponieważ log musi zostać zapisany również wtedy, gdy użytkownik odrzuci propozycję AI. W takim przypadku nie powstaje nowa fiszka, więc nie ma ID do powiązania. Zastosowano `ON DELETE SET NULL`, aby w razie usunięcia fiszki, log pozostał w systemie bez wskazania na nieistniejący rekord.
4.  **Algorytm powtórek**: Kolumny `stability`, `difficulty` i `review_history` są zaprojektowane pod kątem integracji z algorytmem FSRS (Free Spaced Repetition Scheduler), który jest popularnym wyborem open-source. Typ `REAL` dla `stability` i `difficulty` oraz `JSONB` dla `review_history` zapewniają elastyczność i wydajność.
5.  **Logowanie błędów**: Tabela `generation_error_logs` jest kluczowa dla monitorowania i diagnostyki problemów z generowaniem fiszek przez AI. Pozwala na śledzenie błędów po stronie API, problemów z modelem czy błędów walidacji, co jest niezbędne do utrzymania niezawodności usługi.
