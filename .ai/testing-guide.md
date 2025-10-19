# 10xCards API - Przewodnik Testowania

## 🧪 Jak Przetestować API

### Przygotowanie

1. **Uruchom serwer deweloperski**:
   ```bash
   npm run dev
   ```

2. **Zainstaluj narzędzie do testowania API**:
   - [Thunder Client](https://www.thunderclient.com/) (VS Code extension)
   - [Postman](https://www.postman.com/)
   - lub `curl` w terminalu

3. **Uzyskaj JWT token**:
   - Zaloguj się w aplikacji Supabase
   - Skopiuj JWT token z session storage lub z odpowiedzi logowania

---

## 📝 Przykładowe Requesty

### 1. Generowanie Fiszek przez AI

```bash
POST http://localhost:4321/api/flashcards/generate
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "source_text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"
}

Expected Response (200):
{
  "candidates": [
    {
      "front": "Question 1: What is the main concept discussed in section 1?",
      "back": "Answer 1: This is a mock answer that summarizes the key points from the source text. It provides a concise explanation of the concept."
    },
    // ... więcej kandydatów
  ]
}
```

---

### 2. Tworzenie Fiszki (Ręcznie)

```bash
POST http://localhost:4321/api/flashcards
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "front": "What is the capital of France?",
  "back": "Paris is the capital of France."
}

Expected Response (201):
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "What is the capital of France?",
  "back": "Paris is the capital of France.",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": null,
  "difficulty": null,
  "review_history": null,
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}
```

---

### 3. Tworzenie Fiszki (Z Kandydata AI)

```bash
POST http://localhost:4321/api/flashcards
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "front": "What is quantum entanglement?",
  "back": "Quantum entanglement is a physical phenomenon that occurs when pairs of particles interact in ways such that the quantum state of each particle cannot be described independently.",
  "generation_metadata": {
    "original_front": "What is quantum entanglement?",
    "original_back": "Quantum entanglement is a phenomenon in quantum physics."
  }
}

Expected Response (201):
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "What is quantum entanglement?",
  "back": "Quantum entanglement is a physical phenomenon...",
  "due_date": "2025-10-18T12:00:00Z",
  "stability": null,
  "difficulty": null,
  "review_history": null,
  "created_at": "2025-10-18T12:00:00Z",
  "updated_at": "2025-10-18T12:00:00Z"
}

Note: Generation log będzie automatycznie utworzony ze statusem "accepted_with_edit"
```

---

### 4. Listowanie Fiszek

```bash
GET http://localhost:4321/api/flashcards?page=1&limit=20
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (200):
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "Question",
      "back": "Answer",
      "due_date": "2025-10-18T12:00:00Z",
      "stability": null,
      "difficulty": null,
      "review_history": null,
      "created_at": "2025-10-18T12:00:00Z",
      "updated_at": "2025-10-18T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

### 5. Wyszukiwanie Fiszek

```bash
GET http://localhost:4321/api/flashcards?search=quantum
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (200):
{
  "data": [
    // Tylko fiszki zawierające "quantum" w front lub back
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

---

### 6. Pobieranie Pojedynczej Fiszki

```bash
GET http://localhost:4321/api/flashcards/{flashcard_id}
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (200):
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "Question",
  "back": "Answer",
  // ...
}
```

---

### 7. Aktualizacja Fiszki

```bash
PATCH http://localhost:4321/api/flashcards/{flashcard_id}
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "front": "Updated question"
}

Expected Response (200):
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "Updated question",
  "back": "Answer",
  // ...
}
```

---

### 8. Usuwanie Fiszki

```bash
DELETE http://localhost:4321/api/flashcards/{flashcard_id}
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (204):
(no body)
```

---

### 9. Logowanie Odrzuconego Kandydata

```bash
POST http://localhost:4321/api/generation-logs
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "status": "rejected",
  "original_front": "What is X?",
  "original_back": "X is..."
}

Expected Response (201):
{
  "id": "uuid",
  "user_id": "uuid",
  "flashcard_id": null,
  "status": "rejected",
  "original_front": "What is X?",
  "original_back": "X is...",
  "created_at": "2025-10-18T12:00:00Z"
}
```

---

### 10. Pobieranie Fiszek Do Powtórki

```bash
GET http://localhost:4321/api/study/due?limit=20
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (200):
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "front": "Question",
      "back": "Answer",
      "due_date": "2025-10-18T12:00:00Z",
      // ...
    }
  ],
  "total_due": 5
}
```

---

### 11. Przetwarzanie Recenzji

```bash
POST http://localhost:4321/api/study/review
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "flashcard_id": "uuid",
  "rating": 3
}

Expected Response (200):
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "Question",
  "back": "Answer",
  "due_date": "2025-10-20T15:30:00Z",  // Nowa data
  "stability": 2.5,                      // Zaktualizowana
  "difficulty": 4.7,                     // Zaktualizowana
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

---

## 🔴 Testowanie Błędów

### 1. Brak Autentykacji (401)

```bash
GET http://localhost:4321/api/flashcards
# Bez nagłówka Authorization

Expected Response (401):
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### 2. Nieprawidłowa Walidacja (400)

```bash
POST http://localhost:4321/api/flashcards
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "front": "",  // Pusty string
  "back": "Answer"
}

Expected Response (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "fieldErrors": {
        "front": ["Front text is required"]
      }
    }
  }
}
```

---

### 3. Zasób Nie Znaleziony (404)

```bash
GET http://localhost:4321/api/flashcards/00000000-0000-0000-0000-000000000000
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response (404):
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Flashcard not found"
  }
}
```

---

### 4. Rate Limit (429)

```bash
# Wyślij więcej niż 10 requestów w ciągu minuty do /api/flashcards/generate

Expected Response (429):
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 45
    }
  }
}
```

---

## 🎯 Scenariusze Testowe E2E

### Scenariusz 1: Pełny Przepływ Generacji i Akceptacji

1. **Generuj kandydatów**: `POST /api/flashcards/generate`
2. **Akceptuj pierwszego kandydata**: `POST /api/flashcards` (z generation_metadata)
3. **Odrzuć drugiego kandydata**: `POST /api/generation-logs`
4. **Sprawdź listę fiszek**: `GET /api/flashcards`
5. **Edytuj fiszkę**: `PATCH /api/flashcards/:id`

### Scenariusz 2: Sesja Nauki

1. **Stwórz kilka fiszek**: `POST /api/flashcards` (x5)
2. **Pobierz fiszki do powtórki**: `GET /api/study/due`
3. **Przeglądaj pierwszą fiszkę**: Rating 3 (Good)
4. **Przeglądaj drugą fiszkę**: Rating 1 (Again)
5. **Sprawdź czy due_date się zmienił**: `GET /api/flashcards/:id`

### Scenariusz 3: Wyszukiwanie i Filtrowanie

1. **Stwórz fiszki z różnymi tematami**: Quantum, Biology, History
2. **Wyszukaj "quantum"**: `GET /api/flashcards?search=quantum`
3. **Sprawdź paginację**: `GET /api/flashcards?page=1&limit=2`
4. **Sprawdź drugą stronę**: `GET /api/flashcards?page=2&limit=2`

---

## 📊 Checklist Testowania

### Podstawowe Funkcjonalności
- [ ] Generowanie kandydatów AI działa
- [ ] Tworzenie fiszki ręcznie działa
- [ ] Tworzenie fiszki z kandydata AI działa
- [ ] Listowanie fiszek działa
- [ ] Wyszukiwanie fiszek działa
- [ ] Paginacja działa poprawnie
- [ ] Pobieranie pojedynczej fiszki działa
- [ ] Aktualizacja fiszki działa
- [ ] Usuwanie fiszki działa
- [ ] Logowanie odrzuconego kandydata działa
- [ ] Pobieranie fiszek do powtórki działa
- [ ] Przetwarzanie recenzji działa

### Bezpieczeństwo
- [ ] Brak tokenu zwraca 401
- [ ] Nieprawidłowy token zwraca 401
- [ ] Użytkownik nie widzi cudzych fiszek
- [ ] Rate limiting działa (10/min dla generate)
- [ ] Rate limiting działa (100/min dla reszty)

### Walidacja
- [ ] Pusty front/back zwraca 400
- [ ] Za długi front (>200) zwraca 400
- [ ] Za długi back (>500) zwraca 400
- [ ] Za krótki source_text (<1000) zwraca 400
- [ ] Za długi source_text (>10000) zwraca 400
- [ ] Nieprawidłowy UUID zwraca 400
- [ ] Nieprawidłowy rating (0, 5) zwraca 400

### Edge Cases
- [ ] Usuwanie nieistniejącej fiszki zwraca 404
- [ ] Aktualizacja nieistniejącej fiszki zwraca 404
- [ ] Pusta lista fiszek zwraca prawidłową strukturę
- [ ] Brak fiszek do powtórki zwraca pustą listę
- [ ] Review nieistniejącej fiszki zwraca 404

---

## 🐛 Debugowanie

### Sprawdzanie Logów

```bash
# Terminal gdzie działa serwer deweloperski
# Powinny pojawić się logi błędów jeśli coś pójdzie nie tak
```

### Sprawdzanie Bazy Danych

```sql
-- W Supabase SQL Editor

-- Sprawdź fiszki użytkownika
SELECT * FROM flashcards WHERE user_id = 'YOUR_USER_ID';

-- Sprawdź logi generacji
SELECT * FROM generation_logs WHERE user_id = 'YOUR_USER_ID';

-- Sprawdź logi błędów
SELECT * FROM generation_error_logs WHERE user_id = 'YOUR_USER_ID';
```

---

## 📝 Notatki

- **Mock Data**: AI generation obecnie zwraca mockowane dane (5-8 kandydatów)
- **FSRS**: Algorytm FSRS jest obecnie mockowany, wymaga instalacji `ts-fsrs`
- **Rate Limiting**: In-memory, resetuje się po restarcie serwera
- **Timestamps**: Wszystkie daty w formacie ISO 8601 (UTC)

---

**Powodzenia w testowaniu! 🚀**

