# 🔄 Przepływ testowania E2E - Wizualizacja

## 📊 Architektura testów

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTY E2E (Playwright)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Page Object Models                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │ Register │  │Dashboard │  │   Home   │   │
│  │   Page   │  │   Page   │  │   Page   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Selektory (data-testid)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ login-   │  │ register-│  │ generate-│  │  card-   │   │
│  │ form     │  │ form     │  │ button   │  │  front   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Komponenty React/Astro                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ LoginForm│  │ Register │  │Flashcard │  │ Review   │   │
│  │          │  │   Form   │  │Generator │  │  Card    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Aplikacja (Astro)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Przykładowy przepływ testu logowania

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TEST ROZPOCZYNA SIĘ                                       │
│    test('should login', async ({ page }) => { ... })        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. UTWORZENIE PAGE OBJECT                                    │
│    const loginPage = new LoginPage(page);                   │
│                                                               │
│    ┌─────────────────────────────────────────┐              │
│    │ LoginPage inicjalizuje lokatory:        │              │
│    │ - emailInput = getByTestId('email')     │              │
│    │ - passwordInput = getByTestId('pass')   │              │
│    │ - submitButton = getByTestId('submit')  │              │
│    └─────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. NAWIGACJA DO STRONY                                       │
│    await loginPage.goto();                                   │
│                                                               │
│    Browser ──────────> http://localhost:4321/login          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. WERYFIKACJA ZAŁADOWANIA                                   │
│    await loginPage.assertLoaded();                           │
│                                                               │
│    ✓ Sprawdza czy heading jest widoczny                     │
│    ✓ Sprawdza czy formularz jest widoczny                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. WYPEŁNIENIE FORMULARZA                                    │
│    await loginPage.login('user@test.com', 'pass123');       │
│                                                               │
│    ┌─────────────────────────────────────────┐              │
│    │ 5a. emailInput.fill('user@test.com')    │              │
│    │     ↓                                    │              │
│    │     Playwright znajduje element:        │              │
│    │     [data-testid="login-email-input"]   │              │
│    │     ↓                                    │              │
│    │     Wpisuje tekst w input               │              │
│    └─────────────────────────────────────────┘              │
│                                                               │
│    ┌─────────────────────────────────────────┐              │
│    │ 5b. passwordInput.fill('pass123')       │              │
│    │     ↓                                    │              │
│    │     Znajduje [data-testid="login-pass"] │              │
│    │     ↓                                    │              │
│    │     Wpisuje hasło                       │              │
│    └─────────────────────────────────────────┘              │
│                                                               │
│    ┌─────────────────────────────────────────┐              │
│    │ 5c. submitButton.click()                │              │
│    │     ↓                                    │              │
│    │     Znajduje [data-testid="submit"]     │              │
│    │     ↓                                    │              │
│    │     Klika przycisk                      │              │
│    └─────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. APLIKACJA PRZETWARZA ŻĄDANIE                              │
│                                                               │
│    Frontend ──POST──> /api/auth/login                       │
│                 │                                             │
│                 ▼                                             │
│    Backend sprawdza credentials                              │
│                 │                                             │
│                 ▼                                             │
│    Supabase Auth weryfikuje                                  │
│                 │                                             │
│                 ▼                                             │
│    Zwraca token/session                                      │
│                 │                                             │
│                 ▼                                             │
│    Redirect do /dashboard                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. WERYFIKACJA REZULTATU                                     │
│    await expect(page).toHaveURL('/dashboard');              │
│                                                               │
│    ✓ Sprawdza czy URL się zmienił                           │
│    ✓ Test PASSED ✅                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Jak Playwright znajduje elementy?

```
Test wywołuje:
  loginPage.emailInput.fill('test@test.com')
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│ Page Object zwraca lokator:                               │
│   page.getByTestId('login-email-input')                   │
└───────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│ Playwright przeszukuje DOM:                               │
│   document.querySelector('[data-testid="login-email-input"]')
└───────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│ Znajduje element w komponencie:                           │
│                                                             │
│   <Input                                                   │
│     id="email"                                             │
│     type="email"                                           │
│     data-testid="login-email-input" ◄─── TEN ATRYBUT!    │
│     value={email}                                          │
│   />                                                       │
└───────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│ Wykonuje akcję:                                            │
│   element.value = 'test@test.com'                         │
│   element.dispatchEvent(new Event('input'))               │
└───────────────────────────────────────────────────────────┘
```

---

## 🎯 Wzorzec AAA w akcji

### Arrange (Przygotowanie)

```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.assertLoaded();
```

**Co się dzieje:**

- Tworzymy obiekt strony
- Nawigujemy do URL
- Czekamy aż strona się załaduje

### Act (Akcja)

```typescript
await loginPage.login("user@test.com", "password123");
```

**Co się dzieje:**

- Wypełniamy formularz
- Klikamy przycisk submit
- Czekamy na odpowiedź

### Assert (Sprawdzenie)

```typescript
await expect(page).toHaveURL("/dashboard");
await expect(dashboardPage.heading).toBeVisible();
```

**Co się dzieje:**

- Sprawdzamy czy nastąpiło przekierowanie
- Weryfikujemy czy dashboard się załadował

---

## 🔄 Cykl życia testu

```
┌─────────────────────────────────────────────────────────────┐
│ PRZED TESTEM                                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Playwright uruchamia przeglądarkę                        │
│ 2. Tworzy nowy kontekst (izolowane środowisko)             │
│ 3. Otwiera nową kartę (page)                               │
│ 4. Wykonuje test.beforeEach() jeśli istnieje               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PODCZAS TESTU                                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Wykonuje kod testu linia po linii                        │
│ 2. Auto-waiting: czeka na elementy                          │
│ 3. Auto-retry: powtarza asercje do timeoutu                │
│ 4. Zapisuje trace/screenshots przy błędach                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PO TEŚCIE                                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Wykonuje test.afterEach() jeśli istnieje                │
│ 2. Zamyka kartę                                             │
│ 3. Czyści kontekst                                          │
│ 4. Generuje raport                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎭 Auto-waiting w akcji

Playwright automatycznie czeka na elementy:

```
await page.getByTestId('button').click()
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│ Playwright sprawdza czy element:                          │
│ ✓ Istnieje w DOM                                          │
│ ✓ Jest widoczny                                           │
│ ✓ Jest stabilny (nie animowany)                           │
│ ✓ Jest włączony (enabled)                                 │
│ ✓ Nie jest zasłonięty przez inny element                 │
└───────────────────────────────────────────────────────────┘
                │
                ├─── NIE ───> Czeka i sprawdza ponownie
                │              (do 30s domyślnie)
                │
                └─── TAK ──> Wykonuje kliknięcie
```

**Dlatego NIE musisz:**

```typescript
// ❌ Niepotrzebne!
await page.waitForTimeout(1000);
await page.waitForSelector('[data-testid="button"]');
await page.click('[data-testid="button"]');

// ✅ Wystarczy to:
await page.getByTestId("button").click();
```

---

## 📸 Co się dzieje przy błędzie?

```
Test FAILED ❌
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Playwright automatycznie:                                 │
│                                                             │
│ 1. 📸 Robi screenshot                                      │
│    └─> test-results/test-name/screenshot.png             │
│                                                             │
│ 2. 🎥 Zapisuje video (jeśli włączone)                     │
│    └─> test-results/test-name/video.webm                 │
│                                                             │
│ 3. 📊 Generuje trace                                       │
│    └─> test-results/test-name/trace.zip                  │
│                                                             │
│ 4. 📝 Zapisuje logi konsoli                               │
│    └─> test-results/test-name/console.txt                │
└───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│ Możesz debugować:                                          │
│                                                             │
│ npx playwright show-trace trace.zip                       │
│                                                             │
│ Zobacz:                                                    │
│ - Każdy krok testu                                        │
│ - Stan DOM w każdym momencie                             │
│ - Network requests                                         │
│ - Console logs                                             │
│ - Screenshots z każdego kroku                             │
└───────────────────────────────────────────────────────────┘
```

---

## 🎯 Podsumowanie

### Kluczowe punkty:

1. **Page Objects** enkapsulują interakcje ze stroną
2. **data-testid** zapewniają stabilne selektory
3. **Auto-waiting** eliminuje race conditions
4. **Wzorzec AAA** zapewnia czytelność testów
5. **Trace viewer** ułatwia debugowanie

### Przepływ w skrócie:

```
Test → Page Object → Selektor → Element → Akcja → Asercja
```

### Pamiętaj:

- ✅ Testy powinny być niezależne
- ✅ Używaj semantycznych nazw
- ✅ Testuj zachowanie, nie implementację
- ✅ Debuguj z Playwright Inspector
- ✅ Czytaj dokumentację Playwright

---

**Teraz rozumiesz jak to wszystko działa! 🎉**

Przejdź do `QUICK_START.md` aby napisać swój pierwszy test!
