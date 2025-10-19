# Plan implementacji widoku Generatora i Recenzji Fiszki

## 1. Przegląd
Widok Generatora i Recenzji jest centralnym punktem aplikacji, umożliwiającym użytkownikom przekształcanie dostarczonego tekstu w fiszki przy użyciu AI. Składa się z dwóch głównych etapów:
1.  **Etap Generowania:** Użytkownik wprowadza tekst źródłowy w dedykowanym polu.
2.  **Etap Recenzji:** Po wygenerowaniu propozycji, użytkownik przegląda je, akceptując, edytując lub odrzucając każdą z nich.
Celem widoku jest zapewnienie płynnego i interaktywnego doświadczenia, od surowego tekstu do gotowego zestawu fiszek do nauki.

## 2. Routing widoku
Widok będzie dostępny pod główną ścieżką dla zalogowanych użytkowników: `/dashboard`. Stan widoku (generowanie vs. recenzja) będzie zarządzany wewnętrznie, bez zmiany URL.

## 3. Struktura komponentów
```
- DashboardPage (Strona główna, zarządza stanem całego procesu)
  - FlashcardGenerator (Formularz do wprowadzania tekstu i inicjowania generowania)
    - Textarea (pole tekstowe)
    - Button (przycisk "Generuj")
    - Alert (komunikaty walidacyjne)
  - FlashcardReviewer (Interfejs do przeglądania kandydatów)
    - ReviewCard (Karta pojedynczego kandydata)
      - Button (Akceptuj)
      - Button (Edytuj)
      - Button (Odrzuć)
    - EditCardDialog (Modal do edycji kandydata)
      - Input (pole "przód")
      - Input (pole "tył")
      - Button (Zapisz)
    - Alert (Komunikat o zakończeniu recenzji)
```

## 4. Szczegóły komponentów
### FlashcardGenerator
- **Opis komponentu:** Formularz umożliwiający użytkownikowi wklejenie tekstu i rozpoczęcie procesu generowania fiszek. Odpowiada za walidację długości tekstu i wyświetlanie stanu ładowania.
- **Główne elementy:** `Textarea` z licznikiem znaków, `Button` do wysłania formularza, opcjonalny `Alert` do wyświetlania błędów walidacyjnych i `Progress` w trakcie ładowania.
- **Obsługiwane interakcje:**
    - Wpisywanie tekstu w `Textarea`.
    - Kliknięcie przycisku "Generuj", co wywołuje zdarzenie `onSubmit`.
- **Obsługiwana walidacja:**
    - Tekst musi mieć długość od 1000 do 10000 znaków.
- **Typy:** `GenerateFlashcardsRequestDTO`
- **Propsy:**
    - `isLoading: boolean`: Informuje, czy trwa proces generowania.
    - `onSubmit: (text: string) => void`: Funkcja wywoływana po pomyślnej walidacji i kliknięciu przycisku.

### FlashcardReviewer
- **Opis komponentu:** Wyświetla listę kandydatów na fiszki wygenerowanych przez AI i umożliwia użytkownikowi interakcję z nimi.
- **Główne elementy:** Lista komponentów `ReviewCard`, komponent `EditCardDialog` (jeden, zarządzany centralnie), `Alert` z informacją o zakończeniu recenzji.
- **Obsługiwane interakcje:**
    - Akceptacja, edycja lub odrzucenie kandydata.
- **Obsługiwana walidacja:** Brak walidacji po stronie tego komponentu (przekazywana do modala edycji).
- **Typy:** `FlashcardCandidateDTO[]`
- **Propsy:**
    - `candidates: FlashcardCandidateDTO[]`: Tablica kandydatów do wyświetlenia.
    - `onAccept: (candidate: FlashcardCandidateDTO) => void`: Funkcja zwrotna po akceptacji.
    - `onEditAndAccept: (original: FlashcardCandidateDTO, edited: FlashcardCandidateDTO) => void`: Funkcja zwrotna po edycji i akceptacji.
    - `onReject: (candidate: FlashcardCandidateDTO) => void`: Funkcja zwrotna po odrzuceniu.

### ReviewCard
- **Opis komponentu:** Wyświetla treść pojedynczego kandydata na fiszkę (przód i tył) oraz przyciski akcji.
- **Główne elementy:** `Card` z Shadcn/ui, `p` do wyświetlania tekstu, trzy komponenty `Button`.
- **Obsługiwane interakcje:** Kliknięcie przycisków "Akceptuj", "Edytuj", "Odrzuć".
- **Obsługiwana walidacja:** Brak.
- **Typy:** `FlashcardCandidateDTO`
- **Propsy:**
    - `candidate: FlashcardCandidateDTO`: Obiekt kandydata do wyświetlenia.
    - `onAccept: () => void`: Wywoływane po kliknięciu "Akceptuj".
    - `onEdit: () => void`: Wywoływane po kliknięciu "Edytuj".
    - `onReject: () => void`: Wywoływane po kliknięciu "Odrzuć".

### EditCardDialog
- **Opis komponentu:** Modal umożliwiający edycję treści kandydata na fiszkę.
- **Główne elementy:** Komponent `Dialog` z Shadcn/ui, dwa pola `Input` (`front`, `back`), przycisk `Button` do zapisu.
- **Obsługiwane interakcje:** Wprowadzanie tekstu, kliknięcie przycisku "Zapisz".
- **Obsługiwana walidacja:**
    - `front`: wymagane, maksymalnie 200 znaków.
    - `back`: wymagane, maksymalnie 500 znaków.
- **Typy:** `FlashcardCandidateDTO`
- **Propsy:**
    - `isOpen: boolean`: Kontroluje widoczność modala.
    - `candidateToEdit: FlashcardCandidateDTO | null`: Dane kandydata do wypełnienia formularza.
    - `onSave: (editedCandidate: FlashcardCandidateDTO) => void`: Funkcja wywoływana po pomyślnym zapisie.
    - `onClose: () => void`: Funkcja do zamknięcia modala.

## 5. Typy
- **`FlashcardCandidateDTO`**: `{ front: string; back: string; }` - Reprezentuje pojedynczą propozycję fiszki od AI.
- **`GenerateFlashcardsRequestDTO`**: `{ source_text: string; }` - Ciało żądania do generowania kandydatów.
- **`GenerateFlashcardsResponseDTO`**: `{ candidates: FlashcardCandidateDTO[]; }` - Odpowiedź z listą kandydatów.
- **`CreateFlashcardRequestDTO`**: `{ front: string; back: string; generation_metadata?: { original_front: string; original_back: string; } }` - Ciało żądania do tworzenia fiszki (po akceptacji lub edycji).
- **`CreateGenerationLogRequestDTO`**: `{ status: "rejected"; original_front: string; original_back: string; }` - Ciało żądania do logowania odrzucenia.
- **`ApiErrorResponseDTO`**: `{ error: { code: string; message: string; details?: any; } }` - Standardowy format błędu API.

Nie przewiduje się tworzenia dodatkowych, złożonych typów ViewModel. Typy DTO są wystarczające do obsługi stanu widoku.

## 6. Zarządzanie stanem
Zarządzanie stanem będzie realizowane lokalnie w komponencie `DashboardPage` przy użyciu hooków React (`useState`, `useCallback`). Nie ma potrzeby tworzenia customowego hooka ani używania globalnego store'a (np. Zustand, Redux) na tym etapie.

Kluczowe zmienne stanu w `DashboardPage`:
- `viewMode: 'generator' | 'review'`: Kontroluje, która część interfejsu jest widoczna.
- `isLoading: boolean`: Wskazuje, czy trwa zapytanie do API o wygenerowanie fiszek.
- `candidates: FlashcardCandidateDTO[]`: Przechowuje listę kandydatów do recenzji.
- `error: string | null`: Przechowuje komunikaty o błędach z API.

## 7. Integracja API
Komponent `DashboardPage` będzie odpowiedzialny za komunikację z API.

1.  **Generowanie kandydatów:**
    - **Endpoint:** `POST /api/flashcards/generate`
    - **Akcja:** Wysyłanie `source_text` użytkownika.
    - **Typ żądania:** `GenerateFlashcardsRequestDTO`
    - **Typ odpowiedzi (sukces):** `GenerateFlashcardsResponseDTO`
    - **Obsługa:** Po otrzymaniu odpowiedzi, stan `candidates` jest aktualizowany, a `viewMode` przełączany na `'review'`.

2.  **Akceptacja kandydata:**
    - **Endpoint:** `POST /api/flashcards`
    - **Akcja:** Wysyłanie zaakceptowanego kandydata wraz z metadanymi.
    - **Typ żądania:** `CreateFlashcardRequestDTO` (z `generation_metadata`)
    - **Obsługa:** Po sukcesie, kandydat jest usuwany z lokalnego stanu `candidates`.

3.  **Akceptacja po edycji:**
    - **Endpoint:** `POST /api/flashcards`
    - **Akcja:** Wysyłanie edytowanego kandydata wraz z oryginalną wersją w `generation_metadata`.
    - **Typ żądania:** `CreateFlashcardRequestDTO` (z `generation_metadata`)
    - **Obsługa:** Po sukcesie, kandydat jest usuwany z lokalnego stanu `candidates`.

4.  **Odrzucenie kandydata:**
    - **Endpoint:** `POST /api/generation-logs`
    - **Akcja:** Wysyłanie informacji o odrzuconym kandydacie.
    - **Typ żądania:** `CreateGenerationLogRequestDTO`
    - **Obsługa:** Po sukcesie, kandydat jest usuwany z lokalnego stanu `candidates`.

## 8. Interakcje użytkownika
- **Użytkownik wpisuje tekst:** Licznik znaków aktualizuje się na bieżąco. Przycisk "Generuj" jest (de)aktywowane w zależności od długości tekstu.
- **Użytkownik klika "Generuj":** Interfejs jest blokowany, wyświetlany jest wskaźnik ładowania.
- **Użytkownik klika "Akceptuj":** Karta kandydata jest usuwana z listy z animacją. Wyświetlany jest `Toast` z potwierdzeniem.
- **Użytkownik klika "Edytuj":** Otwiera się modal `EditCardDialog` wypełniony danymi kandydata.
- **Użytkownik zapisuje zmiany w modalu:** Modal jest zamykany, karta kandydata znika z listy. Wyświetlany jest `Toast`.
- **Użytkownik klika "Odrzuć":** Karta kandydata jest usuwana z listy. Wyświetlany jest `Toast`.
- **Użytkownik przetworzył wszystkich kandydatów:** Lista znika, a w jej miejscu pojawia się komunikat o zakończeniu recenzji z przyciskiem do przejścia do "Moje Fiszki".

## 9. Warunki i walidacja
- **Długość tekstu źródłowego:** W komponencie `FlashcardGenerator` stan przycisku "Generuj" jest uzależniony od `source_text.length >= 1000 && source_text.length <= 10000`. Jeśli warunek nie jest spełniony, przycisk jest nieaktywny, a obok licznika znaków wyświetlany jest komunikat pomocniczy.
- **Długość pól fiszki (w edycji):** W komponencie `EditCardDialog` przycisk "Zapisz" jest aktywny tylko wtedy, gdy oba pola (`front` i `back`) są niepuste i spełniają limity znaków (`front` <= 200, `back` <= 500). Komunikaty o błędach wyświetlane są pod odpowiednimi polami.

## 10. Obsługa błędów
- **Błędy walidacji (po stronie klienta):** Obsługiwane bezpośrednio w komponentach poprzez wyłączanie przycisków i wyświetlanie komunikatów o błędach, jak opisano w sekcji 9.
- **Błędy API (4xx, 5xx):**
    - Każde wywołanie API będzie opakowane w blok `try...catch`.
    - W przypadku błędu, odpowiedź z API (`ApiErrorResponseDTO`) zostanie sparsowana.
    - Komunikat o błędzie (`error.message`) zostanie wyświetlony użytkownikowi za pomocą komponentu `Toast` (np. "Wystąpił błąd podczas generowania fiszek. Spróbuj ponownie.").
    - Stan `isLoading` zostanie ustawiony na `false`, aby odblokować interfejs.
    - W przypadku błędu generowania, użytkownik pozostanie w widoku `FlashcardGenerator`. W przypadku błędu podczas akcji na kandydacie, karta nie zostanie usunięta z listy.
- **Przypadek braku kandydatów:** Jeśli API zwróci pustą tablicę `candidates`, zostanie to potraktowane jako sukces, ale zamiast listy kandydatów, od razu wyświetli się komunikat: "AI nie znalazło żadnych propozycji fiszek dla tego tekstu."

## 11. Kroki implementacji
1.  **Stworzenie pliku strony:** Utworzenie pliku `src/pages/dashboard.astro` oraz pliku klienckiego `src/components/dashboard/DashboardPage.tsx`, który będzie renderowany w Astro z `client:load`.
2.  **Implementacja komponentu `FlashcardGenerator`:** Zbudowanie formularza z `Textarea` i `Button`. Dodanie logiki walidacji długości tekstu i zarządzania stanem `isLoading`.
3.  **Implementacja stanu widoku:** W `DashboardPage` dodać zmienną stanu `viewMode` i logikę do przełączania między generatorem a widokiem recenzji.
4.  **Integracja z API generowania:** Podpięcie wywołania `POST /api/flashcards/generate` do formularza w `FlashcardGenerator`. Obsługa odpowiedzi i błędów.
5.  **Implementacja komponentu `FlashcardReviewer`:** Stworzenie komponentu, który renderuje listę `ReviewCard` na podstawie propsa `candidates`.
6.  **Implementacja komponentu `ReviewCard`:** Stworzenie karty dla pojedynczego kandydata z przyciskami akcji.
7.  **Implementacja komponentu `EditCardDialog`:** Zbudowanie modala do edycji z formularzem i jego walidacją.
8.  **Integracja z API (akceptacja/edycja/odrzucenie):** W `DashboardPage` zaimplementować funkcje obsługujące akcje z `FlashcardReviewer` i wywołujące odpowiednie endpointy (`POST /api/flashcards`, `POST /api/generation-logs`).
9.  **Zarządzanie listą kandydatów:** Zaimplementować logikę usuwania kandydatów z lokalnego stanu `candidates` po pomyślnej operacji API.
10. **Finalizacja UI:** Dodanie komponentów `Toast` do informacji zwrotnej, obsługa pustego stanu listy kandydatów oraz komunikatu o zakończeniu recenzji.
11. **Stylowanie i responsywność:** Upewnienie się, że cały widok jest w pełni responsywny i zgodny z systemem projektowym.
