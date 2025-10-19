# Specyfikacja Techniczna Modułu Autentykacji - 10xCards

## 1. Wprowadzenie

Niniejszy dokument opisuje architekturę i implementację modułu uwierzytelniania dla aplikacji 10xCards. Celem jest wdrożenie funkcjonalności rejestracji, logowania, wylogowywania, zmiany hasła, usuwania konta oraz odzyskiwania hasła zgodnie z wymaganiami zawartymi w PRD (US-003, US-004, US-014) oraz w oparciu o zdefiniowany stos technologiczny (Astro, React, Supabase).

### 1.1. Założenia i wyjaśnienia

Podczas analizy dokumentu PRD zidentyfikowano potencjalną niespójność w historyjce US-014, która sugeruje, że część funkcjonalności "tworzenia reguł" może być dostępna dla niezalogowanych użytkowników. Jednakże, kluczowe historyjki użytkownika (US-005, US-006) opisują proces generowania i zapisywania fiszek w "kolekcji użytkownika", co jednoznacznie wymaga uwierzytelnienia.

W związku z powyższym, niniejsza specyfikacja techniczna przyjmuje następujące założenie:
**Główna funkcjonalność aplikacji, w tym generowanie, recenzja i zapisywanie fiszek, jest dostępna wyłącznie dla zalogowanych użytkowników.** Trasy prowadzące do tych funkcji (np. `/dashboard`, `/account`) będą chronione i niedostępne dla gości.

## 2. Architektura Interfejsu Użytkownika (Frontend)

### 2.1. Nowe Strony (Astro)

Wprowadzone zostaną nowe strony w katalogu `src/pages` w celu obsługi procesów autentykacji. Strony te będą odpowiedzialne za renderowanie odpowiednich komponentów React oraz za logikę po stronie serwera (np. przekierowania zalogowanych użytkowników).

-   **`/login`**: Strona logowania. Wyświetli komponent `LoginForm.tsx`. Jeśli użytkownik jest już zalogowany, zostanie przekierowany do panelu głównego (`/dashboard`).
-   **`/register`**: Strona rejestracji. Wyświetli komponent `RegisterForm.tsx`. Jeśli użytkownik jest już zalogowany, zostanie przekierowany do panelu głównego.
-   **`/forgot-password`**: Strona do inicjowania procesu odzyskiwania hasła. Wyświetli `ForgotPasswordForm.tsx`.
-   **`/update-password`**: Strona docelowa, na którą użytkownik trafia po kliknięciu linku w mailu do resetowania hasła. Wyświetli `UpdatePasswordForm.tsx`. Logika na tej stronie będzie musiała obsłużyć token resetujący z adresu URL.
-   **`/account`**: Strona zarządzania kontem, dostępna tylko dla zalogowanych użytkowników. Wyświetli komponenty `ChangePasswordForm.tsx` oraz `DeleteAccount.tsx`.

### 2.2. Nowe Komponenty (React)

Komponenty interaktywne zostaną zaimplementowane w React i umieszczone w `src/components/auth`. Będą one bezpośrednio komunikować się z Supabase Auth SDK po stronie klienta.

-   **`LoginForm.tsx`**:
    -   Odpowiedzialność: Formularz z polami na e-mail i hasło.
    -   Walidacja: Walidacja po stronie klienta (format e-mail, niepuste pola).
    -   Logika: Po submisji wywołuje `supabase.auth.signInWithPassword()`. Obsługuje stany ładowania oraz wyświetla błędy zwrócone przez API (np. "Invalid login credentials"). Po sukcesie przekierowuje na `/dashboard`.
-   **`RegisterForm.tsx`**:
    -   Odpowiedzialność: Formularz z polami na e-mail, hasło i potwierdzenie hasła.
    -   Walidacja: Format e-mail, siła hasła (min. 8 znaków), zgodność haseł.
    -   Logika: Po submisji wywołuje `supabase.auth.signUp()`. Obsługuje błędy (np. "User already registered"). Po sukcesie przekierowuje na `/dashboard` i automatycznie loguje użytkownika.
-   **`ForgotPasswordForm.tsx`**:
    -   Odpowiedzialność: Formularz z polem na e-mail.
    -   Logika: Po submisji wywołuje `supabase.auth.resetPasswordForEmail()`. Wyświetla komunikat o wysłaniu instrukcji na podany adres e-mail.
-   **`UpdatePasswordForm.tsx`**:
    -   Odpowiedzialność: Formularz z polem na nowe hasło i jego potwierdzenie.
    -   Walidacja: Siła hasła, zgodność haseł.
    -   Logika: Wywoływana na stronie `/update-password`. Po załadowaniu strony, listener `onAuthStateChange` wykryje zdarzenie `PASSWORD_RECOVERY` i umożliwi aktualizację. Komponent wywoła `supabase.auth.updateUser()` z nowym hasłem. Po sukcesie przekieruje na stronę logowania z komunikatem o pomyślnej zmianie hasła.
-   **`ChangePasswordForm.tsx`**:
    -   Odpowiedzialność: Formularz (na stronie `/account`) z polami na aktualne i nowe hasło.
    -   Logika: Wywołuje `supabase.auth.updateUser()` z nowym hasłem. Wymaga aktywnej sesji użytkownika.
-   **`DeleteAccount.tsx`**:
    -   Odpowiedzialność: Komponent (na stronie `/account`) z przyciskiem inicjującym usunięcie konta.
    -   Logika: Wymaga potwierdzenia od użytkownika (np. poprzez modal i wpisanie słowa "USUŃ"). Do faktycznego usunięcia danych użytkownika zostanie wykorzystana dedykowana funkcja serwerowa (Edge Function) w Supabase, która usunie wpis z `auth.users` oraz wszystkie powiązane dane.
-   **`AuthNav.tsx`**:
    -   Odpowiedzialność: Komponent nawigacyjny wyświetlany w głównym layoucie.
    -   Logika: Warunkowo renderuje linki: "Zaloguj" i "Zarejestruj" dla gości, a dla zalogowanych użytkowników - menu z opcjami "Moje konto" i "Wyloguj". Przycisk "Wyloguj" wywołuje `supabase.auth.signOut()`.

### 2.3. Modyfikacja Layoutu (`src/layouts/Layout.astro`)

Główny layout aplikacji zostanie zaktualizowany, aby zarządzać stanem uwierzytelnienia na poziomie całej aplikacji.

-   W sekcji `<head>` zostanie umieszczony skrypt inicjujący klienta Supabase po stronie klienta.
-   Layout będzie zawierał komponent `AuthNav.tsx`, przekazując do niego informację o stanie sesji pobraną po stronie serwera (`Astro.locals.session`).

### 2.4. Scenariusze i Obsługa Błędów

-   **Walidacja:** Wszystkie formularze będą posiadały walidację client-side przy użyciu biblioteki takiej jak `zod` i `react-hook-form`, aby zapewnić natychmiastowy feedback dla użytkownika.
-   **Komunikaty o błędach:** Błędy serwera (np. z Supabase) będą przechwytywane w blokach `try...catch` i wyświetlane użytkownikowi w przyjaznej formie pod odpowiednimi polami formularza lub jako globalny komunikat (np. przy użyciu komponentu `Toast` z `shadcn/ui`).
-   **Stany ładowania:** Przyciski w formularzach będą blokowane na czas przetwarzania żądania, a użytkownik zobaczy wskaźnik ładowania (spinner).

## 3. Logika Backendowa

Logika backendowa zostanie zrealizowana przy użyciu kombinacji Astro API Routes, middleware'u oraz Supabase (BaaS).

### 3.1. Middleware (`src/middleware/index.ts`)

Middleware będzie kluczowym elementem kontroli dostępu.

-   **Odpowiedzialność:** Przechwytywanie każdego żądania do serwera.
-   **Logika:**
    1.  Inicjalizacja serwerowego klienta Supabase z wykorzystaniem ciasteczek z żądania.
    2.  Pobranie aktualnej sesji użytkownika za pomocą `supabase.auth.getSession()`.
    3.  Zapisanie sesji w `Astro.locals`, aby była dostępna w każdej renderowanej stronie Astro.
    4.  Implementacja logiki ochrony tras:
        -   Zdefiniowanie listy chronionych ścieżek (np. `/dashboard`, `/account`).
        -   Jeśli użytkownik próbuje uzyskać dostęp do chronionej trasy bez aktywnej sesji, zostanie przekierowany na stronę `/login`.
        -   Jeśli zalogowany użytkownik próbuje wejść na `/login` lub `/register`, zostanie przekierowany na `/dashboard`.

### 3.2. Endpointy API i Modele Danych

Większość operacji CRUD na użytkownikach będzie obsługiwana bezpośrednio przez Supabase Auth SDK po stronie klienta. Dedykowane endpointy API w Astro nie będą konieczne dla podstawowych operacji (logowanie, rejestracja).

Jedynym wyjątkiem jest **usunięcie konta**, które ze względów bezpieczeństwa powinno być wykonane po stronie serwera.

-   **Supabase Edge Function: `on-delete-user`**
    -   **Trigger:** Wywoływana przez webhook po usunięciu użytkownika z tabeli `auth.users` lub bezpośrednio z klienta z uprawnieniami `service_role`.
    -   **Logika:** Funkcja ta będzie odpowiedzialna za kaskadowe usunięcie wszystkich danych powiązanych z `user_id` usuwanego użytkownika (np. fiszek, logów generowania) w celu zapewnienia integralności danych.

### 3.3. Renderowanie po stronie serwera

Dzięki `output: 'server'` w `astro.config.mjs` i wykorzystaniu middleware'u, każda strona Astro będzie miała dostęp do informacji o sesji użytkownika w momencie renderowania. Pozwoli to na:

-   Warunkowe renderowanie komponentów w zależności od statusu zalogowania.
-   Przekazywanie danych sesji (np. ID użytkownika) do zapytań bazodanowych po stronie serwera (np. przy pobieraniu listy fiszek).

## 4. System Autentykacji (Supabase Auth)

### 4.1. Konfiguracja

-   **Zmienne środowiskowe:** Klucze Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) zostaną skonfigurowane w pliku `.env`.
-   **Inicjalizacja klienta:** Stworzony zostanie singleton klienta Supabase w `src/db/supabase.ts`, który będzie mógł być importowany zarówno po stronie serwera (w middleware, stronach Astro), jak i klienta (w komponentach React).
-   **Dostawcy autentykacji:** W panelu Supabase zostanie włączony i skonfigurowany dostawca "Email". Opcja "Confirm email" zostanie włączona, aby zapewnić, że użytkownicy rejestrują się z poprawnymi adresami e-mail.
-   **Szablony e-mail:** Szablony dla wiadomości powitalnej, potwierdzenia adresu e-mail oraz resetowania hasła zostaną dostosowane w panelu Supabase, aby pasowały do identyfikacji wizualnej aplikacji.

### 4.2. Przepływ Danych i Sesji

1.  **Rejestracja/Logowanie:** Użytkownik podaje dane w komponencie React. Komponent wysyła żądanie do Supabase Auth.
2.  **Odpowiedź Supabase:** Supabase waliduje dane, tworzy/weryfikuje użytkownika i w przypadku sukcesu zwraca tokeny (access i refresh).
3.  **Zarządzanie sesją przez SDK:** Supabase JS SDK automatycznie zapisuje tokeny w `localStorage` i ustawia bezpieczne, serwerowe ciasteczko (`httpOnly`) zawierające sesję.
4.  **Komunikacja z serwerem Astro:** Przy każdym kolejnym żądaniu do serwera Astro, przeglądarka automatycznie dołącza ciasteczko sesji.
5.  **Walidacja na serwerze:** Middleware Astro odczytuje ciasteczko, weryfikuje sesję przy użyciu Supabase i udostępnia jej dane w `Astro.locals`.

Ten mechanizm zapewnia płynną i bezpieczną komunikację między frontendem, backendem Astro i usługą Supabase, realizując wszystkie założone wymagania funkcjonalne.
