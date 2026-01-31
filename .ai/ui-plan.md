# Architektura UI dla 10xCards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji 10xCards została zaprojektowana w celu zapewnienia płynnego, intuicyjnego i skoncentrowanego na zadaniach doświadczenia użytkownika. Opiera się na jasno zdefiniowanych widokach, które odpowiadają kluczowym funkcjonalnościom opisanym w dokumencie wymagań produktu (PRD) oraz planie API.

Struktura dzieli aplikację na dwie główne strefy:

1.  **Strefa publiczna:** Dostępna dla niezalogowanych użytkowników, obejmująca stronę główną (landing page) oraz formularze logowania i rejestracji. Jej celem jest przedstawienie wartości produktu i umożliwienie łatwego wejścia do aplikacji.
2.  **Strefa prywatna:** Dostępna po zalogowaniu, zawierająca wszystkie kluczowe funkcje, takie jak generator fiszek, zarządzanie kolekcją, sesje nauki i ustawienia konta.

Nawigacja w strefie prywatnej jest scentralizowana wokół stałego, górnego paska nawigacyjnego (navbar), zapewniając szybki dostęp do najważniejszych sekcji. Projekt kładzie duży nacisk na obsługę różnych stanów aplikacji – ładowania, błędów i pustych widoków (empty states) – aby zapewnić użytkownikowi jasną informację zwrotną na każdym etapie interakcji. Architektura jest w pełni responsywna, dostosowując układ do urządzeń mobilnych i desktopowych.

## 2. Lista widoków

### Widoki publiczne

---

**1. Landing Page**

- **Nazwa widoku:** Landing Page
- **Ścieżka:** `/`
- **Główny cel:** Przedstawienie aplikacji 10xCards, jej głównej propozycji wartości oraz zachęcenie użytkowników do rejestracji lub logowania.
- **Kluczowe informacje:** Krótki, chwytliwy nagłówek, jedno lub dwa zdania opisu, wyraźne przyciski Call-To-Action.
- **Kluczowe komponenty:** `Button` (Logowanie, Rejestracja).
- **Względy UX, dostępności i bezpieczeństwa:** Strona statyczna dla maksymalnej wydajności. Zapewnienie wysokiego kontrastu i semantycznej struktury HTML (nagłówki `<h1>`, `<main>`).

**2. Logowanie**

- **Nazwa widoku:** Login
- **Ścieżka:** `/login`
- **Główny cel:** Umożliwienie zarejestrowanym użytkownikom zalogowania się do aplikacji.
- **Kluczowe informacje:** Formularz z polami na e-mail i hasło. Link do strony rejestracji oraz do odzyskiwania hasła.
- **Kluczowe komponenty:** `Form`, `Input`, `Label`, `Button`, `Toast` (dla komunikatów o błędach).
- **Względy UX, dostępności i bezpieczeństwa:** Walidacja po stronie klienta (format e-maila). Jasne komunikaty o błędach (np. "Nieprawidłowe dane logowania"). Pola formularza poprawnie powiązane z etykietami (`<label for="...">`). Zabezpieczenie przed atakami brute-force poprzez rate limiting na API.

**3. Rejestracja**

- **Nazwa widoku:** Register
- **Ścieżka:** `/register`
- **Główny cel:** Umożliwienie nowym użytkownikom założenia konta.
- **Kluczowe informacje:** Formularz z polami na e-mail i hasło. Link do strony logowania.
- **Kluczowe komponenty:** `Form`, `Input`, `Label`, `Button`, `Toast`.
- **Względy UX, dostępności i bezpieczeństwa:** Walidacja w czasie rzeczywistym (format e-maila, siła hasła - min. 8 znaków). Informacja zwrotna o już zajętym adresie e-mail. Po pomyślnej rejestracji automatyczne zalogowanie i przekierowanie do panelu głównego.

---

### Widoki prywatne (dla zalogowanych użytkowników)

---

**4. Panel Główny (Generator)**

- **Nazwa widoku:** Dashboard
- **Ścieżka:** `/dashboard`
- **Główny cel:** Centralny punkt aplikacji, umożliwiający inicjację głównej funkcji – generowania fiszek z tekstu przez AI. Szybki dostęp do rozpoczęcia nauki.
- **Kluczowe informacje:** Duże pole tekstowe na tekst źródłowy, dynamiczny licznik znaków, przycisk "Generuj".
- **Kluczowe komponenty:** `Textarea` (z licznikiem), `Button` (ze stanem ładowania), `Alert` (dla komunikatów walidacyjnych), `Progress` (opcjonalnie, w trakcie generowania).
- **Względy UX, dostępności i bezpieczeństwa:** Przycisk "Generuj" jest nieaktywny, dopóki tekst nie osiągnie wymaganego zakresu (1000-10000 znaków). Kolorowy feedback licznika znaków. W trakcie generowania interfejs jest blokowany, a użytkownik widzi angażujący wskaźnik ładowania z dynamicznymi komunikatami.

**5. Recenzja Kandydatów**

- **Nazwa widoku:** Review
- **Ścieżka:** `/dashboard/review` (lub dynamiczny stan w ramach `/dashboard`)
- **Główny cel:** Umożliwienie użytkownikowi przeglądania, akceptowania, edytowania lub odrzucania propozycji fiszek wygenerowanych przez AI.
- **Kluczowe informacje:** Lista kandydatów na fiszki (przód i tył), licznik pozostałych do przejrzenia.
- **Kluczowe komponenty:** `Card` (dla każdego kandydata), `Button` (Akceptuj, Edytuj, Odrzuć), `Dialog` (modal do edycji fiszki), `Button` (Akceptuj wszystkie).
- **Względy UX, dostępności i bezpieczeństwa:** Przejrzysty układ listy. Modal do edycji pozwala zachować kontekst. Operacje (akceptacja, odrzucenie) dają natychmiastowy feedback wizualny (np. usunięcie karty z listy). Wszystkie akcje są logowane przez wywołania odpowiednich endpointów API.

**6. Moje Fiszki**

- **Nazwa widoku:** My Flashcards
- **Ścieżka:** `/flashcards`
- **Główny cel:** Przeglądanie, wyszukiwanie i zarządzanie całą kolekcją zapisanych fiszek.
- **Kluczowe informacje:** Lista fiszek (przód i tył), pole wyszukiwania, elementy paginacji.
- **Kluczowe komponenty:** `Input` (wyszukiwanie), `Card` (dla każdej fiszki), `Pagination`, `Dialog` (do edycji), `AlertDialog` (do potwierdzenia usunięcia), `Button` (do ręcznego dodawania fiszki).
- **Względy UX, dostępności i bezpieczeństwa:** Obsługa "pustego stanu" (empty state) dla nowych użytkowników z CTA. Wyszukiwanie z debouncingiem (300ms) dla optymalizacji. Paginacja zapobiega ładowaniu zbyt dużej ilości danych naraz. Operacja usunięcia wymaga potwierdzenia, aby zapobiec przypadkowym działaniom.

**7. Sesja Nauki**

- **Nazwa widoku:** Study Session
- **Ścieżka:** `/study`
- **Główny cel:** Przeprowadzenie użytkownika przez sesję nauki opartą na algorytmie powtórek interwałowych (FSRS).
- **Kluczowe informacje:** Przód fiszki, licznik postępu (np. "5/20"), przyciski oceny.
- **Kluczowe komponenty:** `Card`, `Button` ("Pokaż odpowiedź", 4 przyciski oceny), `Progress`, `Tooltip` (dla podpowiedzi o interwałach).
- **Względy UX, dostępności i bezpieczeństwa:** Tryb "bez rozpraszaczy" (minimalistyczny UI). Wyraźne rozróżnienie między pytaniem a odpowiedzią. Przyciski oceny są oznaczone kolorami i tekstem, mają podpowiedzi i obsługują skróty klawiaturowe (1-4) dla dostępności i szybkości.

**8. Ustawienia**

- **Nazwa widoku:** Settings
- **Ścieżka:** `/settings`
- **Główny cel:** Umożliwienie użytkownikowi zarządzania swoim kontem.
- **Kluczowe informacje:** Formularz zmiany hasła, sekcja usuwania konta.
- **Kluczowe komponenty:** `Form`, `Input`, `Button`, `AlertDialog` (dla potwierdzenia usunięcia konta), `Toast`.
- **Względy UX, dostępności i bezpieczeństwa:** Zmiana hasła wymaga podania aktualnego hasła. Usunięcie konta to operacja destrukcyjna, więc jest chroniona wieloetapowym potwierdzeniem. Wszystkie operacje zwracają informację zwrotną za pomocą powiadomień `Toast`.

## 3. Mapa podróży użytkownika

### Główny przepływ: Generowanie i recenzja fiszek

1.  **Start (Panel Główny, `/dashboard`):** Użytkownik ląduje na stronie z dużym polem tekstowym.
2.  **Wprowadzanie tekstu:** Użytkownik wkleja tekst (1000-10000 znaków). Interfejs na bieżąco waliduje długość, aktywując przycisk "Generuj".
3.  **Inicjacja generowania:** Użytkownik klika "Generuj". Wywoływany jest `POST /api/flashcards/generate`.
4.  **Stan ładowania (Panel Główny, `/dashboard`):** Interfejs jest blokowany. Wyświetlany jest wskaźnik ładowania z dynamicznymi komunikatami (np. "Analizuję tekst...", "Tworzę propozycje...").
5.  **Prezentacja kandydatów (Widok Recenzji, `/dashboard/review`):** Po otrzymaniu odpowiedzi z API, użytkownik widzi listę wygenerowanych kandydatów.
6.  **Recenzja:**
    - **Akceptacja:** Kliknięcie "Akceptuj" wywołuje `POST /api/flashcards` z `generation_metadata`. Fiszka znika z listy.
    - **Edycja i akceptacja:** Kliknięcie "Edytuj" otwiera modal. Po zapisaniu zmian wywoływany jest `POST /api/flashcards` ze zmienioną treścią i `generation_metadata`. Fiszka znika z listy.
    - **Odrzucenie:** Kliknięcie "Odrzuć" wywołuje `POST /api/generation-logs`. Fiszka znika z listy.
7.  **Zakończenie recenzji:** Po przejrzeniu wszystkich kandydatów, użytkownik widzi komunikat sukcesu z przyciskiem przekierowującym do widoku "Moje Fiszki" (`/flashcards`).

### Inne kluczowe przepływy:

- **Ręczne zarządzanie fiszkami:** Użytkownik nawiguje do `/flashcards`. Może tam wyszukiwać, paginować listę, a także dodawać, edytować i usuwać fiszki za pomocą dedykowanych przycisków i modali.
- **Sesja nauki:** Użytkownik klika "Nauka" w nawigacji, przechodząc do `/study`. Aplikacja wywołuje `GET /api/study/due`, aby pobrać fiszki. Użytkownik przechodzi przez cykl: Pokaż odpowiedź -> Oceń -> Następna fiszka. Każda ocena wywołuje `POST /api/study/review`.
- **Zarządzanie kontem:** Użytkownik wchodzi do `/settings` z menu użytkownika, gdzie może zmienić hasło lub usunąć konto.

## 4. Układ i struktura nawigacji

### Układ ogólny

- Aplikacja wykorzystuje stały, górny pasek nawigacyjny (navbar) i główną sekcję treści (`<main>`).
- Układ treści jest wyśrodkowany z maksymalną szerokością (~1200px) na urządzeniach desktopowych, aby zapewnić czytelność.
- Na urządzeniach mobilnych układ jest w pełni płynny.

### Struktura nawigacji (dla zalogowanego użytkownika)

1.  **Górny Pasek Nawigacyjny (Navbar):**
    - **Logo/Nazwa aplikacji (lewa strona):** Link do panelu głównego (`/dashboard`).
    - **Główne linki (centrum):**
      - `Generator` (link do `/dashboard`)
      - `Moje Fiszki` (link do `/flashcards`)
      - `Nauka` (link do `/study`)
    - **Menu Użytkownika (prawa strona):**
      - `Avatar` użytkownika, który rozwija `Dropdown Menu`.
      - **Zawartość dropdown:**
        - E-mail użytkownika (nieklikalny)
        - Separator
        - `Ustawienia` (link do `/settings`)
        - Separator
        - `Wyloguj się` (przycisk)

### Adaptacja mobilna

- Na urządzeniach mobilnych (<768px) główne linki nawigacyjne są zwinięte do menu hamburgera (`Sheet`), które wysuwa się z boku ekranu.
- Menu użytkownika (`Dropdown Menu`) pozostaje bez zmian.

### Ochrona tras

- Wszystkie ścieżki prywatne (`/dashboard`, `/flashcards`, `/study`, `/settings`) są chronione przez middleware.
- Próba dostępu bez aktywnej sesji (ważnego tokenu JWT) skutkuje przekierowaniem do strony logowania (`/login`).

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów UI, które będą bazować na bibliotece `Shadcn/ui` i stylach `Tailwind CSS`.

- **`Button`:** Standardowy komponent przycisku z wariantami (primary, secondary, destructive, ghost) i stanem ładowania. Używany do wszystkich akcji w aplikacji.
- **`Input` / `Textarea`:** Pola formularzy. Wersje rozszerzone o dynamiczny licznik znaków i komunikaty walidacyjne.
- **`Card`:** Podstawowy kontener do wyświetlania treści, takich jak kandydaci na fiszki, fiszki na liście czy aktualna fiszka w sesji nauki.
- **`Dialog` (Modal):** Okno modalne używane do zadań, które wymagają skupienia i zachowania kontekstu strony, np. edycja lub ręczne tworzenie fiszki.
- **`AlertDialog`:** Specjalny typ modala do potwierdzania operacji destrukcyjnych, takich jak usuwanie fiszki czy całego konta.
- **`Toast`:** Dyskretne powiadomienia (pop-up) w rogu ekranu, służące do informowania o wyniku operacji (np. "Fiszka została zapisana", "Wystąpił błąd API").
- **`Pagination`:** Komponent do nawigacji po stronach w widoku "Moje Fiszki".
- **`Dropdown Menu`:** Używane do menu użytkownika w pasku nawigacyjnym.
- **`Sheet`:** Wysuwany panel boczny, używany jako kontener na nawigację mobilną.
- **`Skeleton`:** "Szkielet" interfejsu wyświetlany podczas ładowania danych (np. listy fiszek), poprawiający odczuwalną wydajność.
- **`Form`:** Komponent opakowujący formularze, integrujący walidację i zarządzanie stanem.
