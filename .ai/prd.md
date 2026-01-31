# Dokument wymagań produktu (PRD) - 10xCards

## 1. Przegląd produktu

10xCards to inteligentna aplikacja do nauki, zaprojektowana w celu zautomatyzowania i zoptymalizowania procesu tworzenia fiszek. Główne założenie produktu opiera się na wykorzystaniu sztucznej inteligencji do generowania propozycji fiszek na podstawie dostarczonego przez użytkownika tekstu, np. notatek z wykładu lub artykułu. Użytkownik może następnie przejrzeć wygenerowane fiszki, zaakceptować je, edytować lub odrzucić, co znacząco przyspiesza przygotowanie materiałów do nauki.

Aplikacja w wersji MVP (Minimum Viable Product) będzie skupiać się na podstawowych funkcjonalnościach, takich jak: zarządzanie kontem użytkownika, generowanie fiszek przez AI, proces ich recenzji i akceptacji, a także manualne tworzenie i zarządzanie fiszkami. Integralną częścią systemu będzie integracja z gotową biblioteką open-source do nauki metodą powtórek interwałowych (spaced repetition). Sukces produktu będzie mierzony za pomocą wbudowanej analityki, logującej interakcje użytkownika z wygenerowanymi przez AI propozycjami.

## 2. Problem użytkownika

Celem projektu jest rozwiązanie dwóch kluczowych problemów, z którymi borykają się osoby uczące się, zwłaszcza studenci i profesjonaliści:

1.  **Czasochłonność tworzenia fiszek:** Ręczne przepisywanie i formatowanie materiałów do nauki w formie fiszek jest procesem powolnym i monotonnym. Użytkownicy często rezygnują z tej efektywnej metody nauki ze względu na barierę czasową związaną z przygotowaniem materiałów.
2.  **Dezorientacja w dzieleniu materiału:** Początkujący użytkownicy często mają trudności z optymalnym podziałem większych partii materiału na zwięzłe, łatwe do przyswojenia pary pytań i odpowiedzi. Skutkuje to tworzeniem nieefektywnych fiszek, które są zbyt ogólne lub przeładowane informacjami.

10xCards adresuje te problemy, automatyzując proces tworzenia fiszek i dostarczając użytkownikom dobrze sformułowane propozycje, co pozwala im skupić się na nauce, a nie na przygotowaniach.

## 3. Wymagania funkcjonalne

### 3.1. Zarządzanie kontem użytkownika

- Rejestracja nowego użytkownika przy użyciu adresu e-mail i hasła.
- Logowanie do istniejącego konta.
- Możliwość zmiany hasła przez zalogowanego użytkownika.
- Możliwość trwałego usunięcia swojego konta.

### 3.2. Generowanie fiszek przez AI

- Użytkownik może wkleić lub wpisać tekst o długości od 1000 do 10000 znaków w dedykowanym polu tekstowym.
- System wysyła tekst do modelu AI w celu wygenerowania propozycji fiszek (kandydatów).
- Fiszka-kandydat składa się z dwóch pól: "przód" (maks. 200 znaków) i "tył" (maks. 500 znaków).
- Limity znaków (dla tekstu wejściowego i pól fiszki) są walidowane na poziomie frontendu, backendu i bazy danych.

### 3.3. Proces recenzji kandydatów

- Wygenerowani kandydaci są prezentowani użytkownikowi w interfejsie do recenzji. Kandydaci nie są zapisywani w bazie danych na tym etapie.
- Użytkownik może wykonać jedną z trzech akcji dla każdej propozycji:
  - **Akceptuj:** Fiszka jest zapisywana w kolekcji użytkownika i staje się dostępna do nauki.
  - **Edytuj:** Użytkownik może zmodyfikować treść pól "przód" i "tył", a następnie zapisać fiszkę.
  - **Odrzuć:** Fiszka-kandydat jest trwale usuwana.

### 3.4. Ręczne zarządzanie fiszkami

- Użytkownik ma dostęp do formularza umożliwiającego ręczne dodanie nowej fiszki.
- Użytkownik może przeglądać listę wszystkich swoich zapisanych fiszek.
- Lista fiszek obsługuje wyszukiwanie oraz paginację.
- Użytkownik może edytować istniejącą fiszkę.
- Użytkownik może usunąć istniejącą fiszkę.

### 3.5. Nauka

- System jest zintegrowany z biblioteką open-source do obsługi algorytmu powtórek interwałowych.
- Użytkownik może rozpocząć sesję nauki opartą na swoich zapisanych fiszkach.

### 3.6. Analityka

- Każda akcja podjęta w procesie recenzji (akceptacja, akceptacja po edycji, odrzucenie) jest logowana do dedykowanej tabeli `generation_logs` w bazie danych.
- Logi zawierają informacje o statusie operacji i powiązane metadane.

## 4. Granice produktu

Następujące elementy znajdują się poza zakresem MVP i mogą zostać rozważone w przyszłych iteracjach:

- **Zaawansowana analityka:** W MVP nie będą implementowane zewnętrzne narzędzia analityczne ani testy A/B. Analiza będzie opierać się wyłącznie na danych z bazy.
- **Złożona struktura fiszki:** Fiszki będą składać się tylko z dwóch pól tekstowych. Obsługa obrazów, formatowania tekstu czy dodatkowych pól nie jest częścią MVP.
- **Udostępnianie i współpraca:** Brak możliwości udostępniania fiszek lub talii innym użytkownikom.
- **Organizacja fiszek:** Brak możliwości grupowania fiszek w talie lub kategorie. Wszystkie fiszki użytkownika znajdują się na jednej liście.
- **Aplikacje mobilne:** MVP będzie aplikacją webową.
- **Limity użycia:** Na etapie MVP nie są planowane żadne limity dotyczące liczby generowań AI ani liczby posiadanych fiszek.

Nierozwiązane kwestie, które wymagają dalszych decyzji projektowych, ale nie blokują startu prac:

- Szczegółowy projekt UI/UX dla komunikatów o błędach i walidacji.
- Projekt komunikatu dla użytkownika w przypadku, gdy AI nie zwróci żadnych kandydatów.
- Domyślne sortowanie listy fiszek i ewentualne opcje sortowania dla użytkownika.
- Obsługa konfliktu między edycją fiszki a jej użyciem w aktywnej sesji nauki.
- Finalny schemat tabeli `generation_logs` (dokładne pola i typy danych).

## 5. Historyjki użytkowników

### Zarządzanie Kontem

- **ID:** US-001
- **Tytuł:** Rejestracja nowego użytkownika
- **Opis:** Jako nowy użytkownik, chcę móc założyć konto za pomocą adresu e-mail i hasła, aby uzyskać dostęp do aplikacji.
- **Kryteria akceptacji:**
  1.  Formularz rejestracji zawiera pola na e-mail i hasło.
  2.  System waliduje poprawność formatu adresu e-mail.
  3.  System waliduje siłę hasła (np. min. 8 znaków).
  4.  Po pomyślnej rejestracji, użytkownik jest automatycznie zalogowany i przekierowany do głównego panelu aplikacji.
  5.  System uniemożliwia rejestrację na już istniejący adres e-mail.

- **ID:** US-002
- **Tytuł:** Logowanie użytkownika
- **Opis:** Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby kontynuować korzystanie z aplikacji.
- **Kryteria akceptacji:**
  1.  Formularz logowania zawiera pola na e-mail i hasło.
  2.  Po podaniu poprawnych danych, użytkownik jest zalogowany i przekierowany do głównego panelu.
  3.  W przypadku podania błędnych danych, użytkownik widzi stosowny komunikat o błędzie.

- **ID:** US-003
- **Tytuł:** Zmiana hasła
- **Opis:** Jako zalogowany użytkownik, chcę mieć możliwość zmiany swojego hasła, aby zabezpieczyć swoje konto.
- **Kryteria akceptacji:**
  1.  W ustawieniach konta dostępny jest formularz zmiany hasła.
  2.  Użytkownik musi podać swoje aktualne hasło oraz nowe hasło.
  3.  Nowe hasło musi spełniać wymogi bezpieczeństwa.
  4.  Po pomyślnej zmianie, użytkownik otrzymuje potwierdzenie.

- **ID:** US-004
- **Tytuł:** Usunięcie konta
- **Opis:** Jako użytkownik, chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich moich danych.
- **Kryteria akceptacji:**
  1.  W ustawieniach konta dostępna jest opcja usunięcia konta.
  2.  Użytkownik musi potwierdzić swoją decyzję (np. poprzez wpisanie hasła lub kliknięcie w checkbox).
  3.  Po potwierdzeniu, konto użytkownika i wszystkie powiązane z nim dane (w tym fiszki) są trwale usuwane z systemu.

### Generowanie i Recenzja Fiszki

- **ID:** US-005
- **Tytuł:** Generowanie fiszek z tekstu
- **Opis:** Jako użytkownik, chcę wkleić tekst i zainicjować proces generowania fiszek przez AI, aby szybko otrzymać propozycje do nauki.
- **Kryteria akceptacji:**
  1.  Na stronie głównej znajduje się pole tekstowe do wklejenia tekstu.
  2.  Interfejs wyświetla licznik znaków dla wklejonego tekstu.
  3.  Przycisk "Generuj" jest aktywny tylko wtedy, gdy tekst ma długość od 1000 do 10000 znaków.
  4.  Po kliknięciu "Generuj", system wyświetla wskaźnik ładowania i blokuje interfejs do czasu otrzymania odpowiedzi od AI.
  5.  Po pomyślnym wygenerowaniu, użytkownik jest przekierowywany do widoku recenzji kandydatów.

- **ID:** US-006
- **Tytuł:** Recenzja, akceptacja i odrzucenie kandydatów
- **Opis:** Jako użytkownik, chcę przeglądać wygenerowane przez AI propozycje fiszek i decydować, które z nich zapisać.
- **Kryteria akceptacji:**
  1.  Wygenerowani kandydaci są wyświetlani w formie listy, gdzie każda pozycja pokazuje "przód" i "tył" fiszki.
  2.  Każdy kandydat ma wyraźnie oznaczone przyciski: "Akceptuj", "Edytuj", "Odrzuć".
  3.  Kliknięcie "Akceptuj" zapisuje fiszkę w kolekcji użytkownika, usuwa kandydata z listy i loguje zdarzenie w analityce.
  4.  Kliknięcie "Odrzuć" trwale usuwa kandydata z listy i loguje zdarzenie w analityce.
  5.  Po przetworzeniu wszystkich kandydatów, użytkownik widzi komunikat o zakończeniu recenzji.

- **ID:** US-007
- **Tytuł:** Edycja kandydata na fiszkę
- **Opis:** Jako użytkownik, chcę mieć możliwość edycji treści kandydata przed jego zaakceptowaniem, aby poprawić lub dostosować jego zawartość.
- **Kryteria akceptacji:**
  1.  Kliknięcie przycisku "Edytuj" otwiera modal lub formularz inline z polami "przód" i "tył", wypełnionymi treścią kandydata.
  2.  Użytkownik może modyfikować tekst w obu polach.
  3.  Walidacja długości pól (200/500 znaków) jest aktywna podczas edycji.
  4.  Po zapisaniu zmian, zmodyfikowana fiszka jest dodawana do kolekcji użytkownika, kandydat jest usuwany z listy, a zdarzenie jest logowane w analityce jako "zaakceptowany po edycji".

- **ID:** US-008
- **Tytuł:** Obsługa błędu walidacji tekstu wejściowego
- **Opis:** Jako użytkownik, próbując wygenerować fiszki z tekstu o nieprawidłowej długości, chcę otrzymać jasny komunikat o błędzie.
- **Kryteria akceptacji:**
  1.  Gdy tekst jest krótszy niż 1000 znaków, przycisk "Generuj" jest nieaktywny, a obok licznika znaków pojawia się komunikat informujący o minimalnym limicie.
  2.  Gdy tekst jest dłuższy niż 10000 znaków, przycisk "Generuj" jest nieaktywny, a obok licznika znaków pojawia się komunikat informujący o maksymalnym limicie.

### Ręczne Zarządzanie Fiszkami

- **ID:** US-009
- **Tytuł:** Ręczne tworzenie fiszki
- **Opis:** Jako użytkownik, chcę mieć możliwość ręcznego dodania nowej fiszki, gdy mam w głowie konkretne pytanie i odpowiedź.
- **Kryteria akceptacji:**
  1.  Dostępny jest prosty formularz z polami "przód" i "tył".
  2.  Formularz waliduje limity znaków (200/500).
  3.  Po pomyślnym dodaniu, fiszka pojawia się na liście moich fiszek.

- **ID:** US-010
- **Tytuł:** Przeglądanie listy fiszek
- **Opis:** Jako użytkownik, chcę mieć dostęp do listy wszystkich moich zapisanych fiszek, aby móc je przeglądać i zarządzać nimi.
- **Kryteria akceptacji:**
  1.  Istnieje dedykowana strona lub sekcja "Moje Fiszki".
  2.  Fiszki są wyświetlane na liście w paginowany sposób.
  3.  Dostępne jest pole wyszukiwania, które filtruje fiszki na podstawie treści z pól "przód" i "tył".

- **ID:** US-011
- **Tytuł:** Edycja istniejącej fiszki
- **Opis:** Jako użytkownik, chcę móc edytować moje wcześniej zapisane fiszki, aby poprawić błędy lub zaktualizować informacje.
- **Kryteria akceptacji:**
  1.  Każda fiszka na liście ma opcję "Edytuj".
  2.  Kliknięcie "Edytuj" otwiera modal z formularzem do edycji pól "przód" i "tył".
  3.  Po zapisaniu zmian, lista fiszek odzwierciedla zaktualizowaną treść.

- **ID:** US-012
- **Tytuł:** Usuwanie istniejącej fiszki
- **Opis:** Jako użytkownik, chcę móc usunąć fiszkę, która nie jest mi już potrzebna.
- **Kryteria akceptacji:**
  1.  Każda fiszka na liście ma opcję "Usuń".
  2.  Przed usunięciem system prosi o potwierdzenie operacji.
  3.  Po potwierdzeniu, fiszka jest trwale usuwana z kolekcji użytkownika.

### Kolekcje Reguł

- **ID:** US-013
- **Tytuł:** Kolekcje reguł
- **Opis:** Jako użytkownik chcę móc zapisywać i edytować zestawy reguł, aby szybko wykorzystywać sprawdzone rozwiązania w różnych projektach.
- **Kryteria akceptacji:**
  1.  Użytkownik może zapisać aktualny zestaw reguł (US-001) jako kolekcję (nazwa, opis, reguły).
  2.  Użytkownik może aktualizować kolekcję.
  3.  Użytkownik może usunąć kolekcję.
  4.  Użytkownik może przywrócić kolekcję do poprzedniej wersji (pending changes).
  5.  Funkcjonalność kolekcji nie jest dostępna bez logowania się do systemu (US-004).

### Bezpieczny Dostęp i Uwierzytelnianie

- **ID:** US-014
- **Tytuł:** Bezpieczny dostęp
- **Opis:** Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
- **Kryteria akceptacji:**
  1.  Logowanie i rejestracja odbywają się na dedykowanych stronach.
  2.  Logowanie wymaga podania adresu email i hasła.
  3.  Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  4.  Użytkownik MOŻE korzystać z tworzenia reguł "ad-hoc" bez logowania się do systemu (US-001).
  5.  Użytkownik NIE MOŻE korzystać z funkcji Kolekcji bez logowania się do systemu (US-013).
  6.  Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu.
  7.  Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym Layout.astro.
  8.  Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  9.  Odzyskiwanie hasła powinno być możliwe.

## 6. Metryki sukcesu

Kluczowe wskaźniki efektywności (KPI) dla wersji MVP będą mierzone w celu oceny skuteczności funkcji generowania fiszek przez AI.

1.  **Wskaźnik Akceptacji AI (AI Acceptance Rate):**
    - **Cel:** 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika (bezpośrednio lub po edycji).
    - **Sposób pomiaru:** Analiza danych z tabeli `generation_logs`. Wskaźnik będzie obliczany jako `(liczba zaakceptowanych + liczba zaakceptowanych po edycji) / (łączna liczba wygenerowanych kandydatów) * 100%`.

2.  **Wskaźnik Wykorzystania AI (AI Adoption Rate):**
    - **Cel:** 75% wszystkich nowo tworzonych fiszek w systemie powstaje przy użyciu generatora AI.
    - **Sposób pomiaru:** Okresowa analiza stosunku liczby fiszek stworzonych przez AI (na podstawie `generation_logs`) do całkowitej liczby nowo dodanych fiszek w systemie (manualnych + AI).

Pomiary będą dokonywane poprzez okresowe (np. miesięczne) agregowanie i analizowanie danych z bazy danych. Na etapie MVP nie jest wymagany dashboard analityczny w czasie rzeczywistym.
