# 📚 Przewodnik po testach E2E w projekcie 10xCards

## 🎯 Czym są testy E2E (End-to-End)?

Testy E2E (End-to-End) to rodzaj testów, które sprawdzają całą aplikację od początku do końca, symulując rzeczywiste zachowania użytkownika. W przeciwieństwie do testów jednostkowych, które testują pojedyncze funkcje, testy E2E weryfikują, czy cały system działa poprawnie jako całość.

### Dlaczego testy E2E są ważne?

- ✅ **Testują rzeczywiste scenariusze użytkownika** - sprawdzają, czy użytkownik może wykonać konkretne zadania
- ✅ **Wykrywają problemy integracyjne** - znajdują błędy w komunikacji między komponentami
- ✅ **Zwiększają pewność przed wdrożeniem** - dają pewność, że kluczowe funkcje działają
- ✅ **Dokumentują przepływy użytkownika** - testy są żywą dokumentacją aplikacji

## 🏗️ Architektura testów w tym projekcie

### Struktura katalogów

```
e2e/
├── pages/              # Page Object Models
│   ├── home.page.ts
│   ├── login.page.ts
│   ├── register.page.ts
│   └── dashboard.page.ts
├── auth.spec.ts        # Testy autentykacji
├── flashcards.spec.ts  # Testy generowania fiszek
├── home.spec.ts        # Testy strony głównej
└── README.md          # Ten plik
```

### Page Object Model (POM)

**Page Object Model** to wzorzec projektowy, który:
- Enkapsuluje interakcje ze stroną w klasach
- Ułatwia utrzymanie testów
- Redukuje duplikację kodu
- Sprawia, że testy są bardziej czytelne

#### Przykład Page Object:

```typescript
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-button');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

## 🎨 Selektory `data-testid`

### Dlaczego używamy `data-testid`?

Selektory `data-testid` są najlepszą praktyką w testach E2E, ponieważ:

1. **Są stabilne** - nie zmieniają się przy zmianach CSS czy struktury HTML
2. **Są semantyczne** - jasno wskazują, że element jest przeznaczony do testowania
3. **Są niezależne od implementacji** - nie polegają na klasach CSS czy ID

### Gdzie dodawać `data-testid`?

✅ **Dodawaj wewnątrz komponentów:**

```tsx
// ✅ DOBRZE - w komponencie LoginForm.tsx
export default function LoginForm() {
  return (
    <form data-testid="login-form">
      <input data-testid="login-email-input" />
      <button data-testid="login-submit-button">Login</button>
    </form>
  );
}
```

❌ **NIE dodawaj na zewnątrz:**

```tsx
// ❌ ŹLE - w komponencie nadrzędnym
<LoginForm data-testid="login-form" />
```

### Konwencja nazewnictwa

Stosujemy następującą konwencję dla `data-testid`:

- **Formularze**: `{nazwa}-form` (np. `login-form`, `register-form`)
- **Inputy**: `{nazwa}-{typ}-input` (np. `login-email-input`, `register-password-input`)
- **Przyciski**: `{akcja}-button` (np. `submit-button`, `accept-card-button`)
- **Linki**: `{cel}-link` (np. `register-link`, `forgot-password-link`)
- **Alerty**: `{typ}-alert` (np. `error-alert`, `success-alert`)
- **Kontenery**: `{nazwa}-{typ}` (np. `flashcard-generator`, `candidates-list`)

## 🧪 Pisanie testów

### Podstawowa struktura testu

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    // 1. Arrange - przygotuj stan początkowy
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // 2. Act - wykonaj akcję
    await loginPage.login('user@example.com', 'password123');
    
    // 3. Assert - sprawdź rezultat
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Wzorzec AAA (Arrange-Act-Assert)

Każdy test powinien być podzielony na trzy sekcje:

1. **Arrange** (Przygotowanie) - ustaw stan początkowy
2. **Act** (Akcja) - wykonaj testowaną operację
3. **Assert** (Sprawdzenie) - zweryfikuj rezultat

## 📝 Co warto testować?

### ✅ Testy, które WARTO pisać:

1. **Kluczowe przepływy użytkownika (Happy Paths)**
   - Rejestracja nowego użytkownika
   - Logowanie
   - Generowanie fiszek
   - Akceptowanie/odrzucanie fiszek

2. **Walidacja formularzy**
   - Wyświetlanie błędów przy nieprawidłowych danych
   - Włączanie/wyłączanie przycisków submit
   - Wymagania dotyczące hasła

3. **Nawigacja**
   - Przekierowania po zalogowaniu
   - Linki między stronami
   - Ochrona tras wymagających autentykacji

4. **Obsługa błędów**
   - Wyświetlanie komunikatów o błędach
   - Nieprawidłowe dane logowania
   - Błędy API

### ❌ Testy, których NIE WARTO pisać:

1. **Szczegóły stylowania** - to nie jest zadanie testów E2E
2. **Testy jednostkowe w E2E** - używaj testów jednostkowych do logiki biznesowej
3. **Każda możliwa kombinacja** - skup się na najważniejszych scenariuszach

## 🚀 Uruchamianie testów

### Komendy podstawowe

```bash
# Uruchom wszystkie testy E2E
npm run e2e

# Uruchom testy w trybie headed (z widoczną przeglądarką)
npm run e2e:headed

# Uruchom konkretny plik testów
npx playwright test e2e/auth.spec.ts

# Uruchom testy z konkretnym opisem
npx playwright test -g "should login"

# Pokaż raport HTML
npm run e2e:report
```

### Tryby uruchamiania

1. **Headless** (domyślny) - szybki, bez GUI, idealny do CI/CD
2. **Headed** - z widoczną przeglądarką, dobry do debugowania
3. **Debug** - krok po kroku z Playwright Inspector

```bash
# Tryb debug
npx playwright test --debug
```

## 🐛 Debugowanie testów

### 1. Użyj Playwright Inspector

```bash
npx playwright test --debug
```

### 2. Dodaj `page.pause()` w teście

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/login');
  await page.pause(); // Zatrzyma wykonanie
  await page.fill('[data-testid="email"]', 'test@test.com');
});
```

### 3. Zrób screenshot

```typescript
await page.screenshot({ path: 'debug.png' });
```

### 4. Sprawdź trace

Playwright automatycznie zapisuje trace przy pierwszym niepowodzeniu:

```bash
npx playwright show-trace trace.zip
```

## 🎬 Przykładowe scenariusze testowe

### Scenariusz 1: Rejestracja i logowanie

```typescript
test('complete registration flow', async ({ page }) => {
  // 1. Otwórz stronę rejestracji
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  
  // 2. Wypełnij formularz
  const email = `test-${Date.now()}@example.com`;
  await registerPage.register(email, 'SecurePass123', 'SecurePass123');
  
  // 3. Sprawdź komunikat o sukcesie
  await registerPage.assertSuccessMessageDisplayed();
  
  // 4. Przejdź do logowania
  // (w rzeczywistości musisz potwierdzić email)
});
```

### Scenariusz 2: Generowanie fiszek

```typescript
test('generate and review flashcards', async ({ page }) => {
  // 1. Zaloguj się (zakładając, że masz funkcję pomocniczą)
  await loginAsTestUser(page);
  
  // 2. Przejdź do dashboardu
  const dashboard = new DashboardPage(page);
  await dashboard.assertLoaded();
  
  // 3. Wygeneruj fiszki
  await dashboard.generateFlashcards(SAMPLE_TEXT);
  
  // 4. Sprawdź, czy pojawiły się propozycje
  await dashboard.assertReviewerVisible();
  const count = await dashboard.getReviewCardsCount();
  expect(count).toBeGreaterThan(0);
  
  // 5. Zaakceptuj pierwszą fiszkę
  await dashboard.acceptFirstCard();
});
```

## 🔧 Konfiguracja

Konfiguracja Playwright znajduje się w `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: 'e2e',                    // Katalog z testami
  fullyParallel: true,               // Równoległe wykonywanie
  use: {
    baseURL: 'http://localhost:4321', // Bazowy URL
    trace: 'on-first-retry',          // Trace przy powtórkach
    screenshot: 'only-on-failure',    // Screenshot przy błędach
    video: 'retain-on-failure',       // Video przy błędach
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

## 🎓 Najlepsze praktyki

### 1. Używaj Page Object Models

✅ **Dobrze:**
```typescript
const loginPage = new LoginPage(page);
await loginPage.login('user@test.com', 'pass123');
```

❌ **Źle:**
```typescript
await page.fill('[data-testid="email"]', 'user@test.com');
await page.fill('[data-testid="password"]', 'pass123');
await page.click('[data-testid="submit"]');
```

### 2. Używaj asercji z Playwright

✅ **Dobrze:**
```typescript
await expect(page.getByTestId('error')).toBeVisible();
```

❌ **Źle:**
```typescript
const isVisible = await page.getByTestId('error').isVisible();
expect(isVisible).toBe(true);
```

### 3. Czekaj na elementy automatycznie

Playwright automatycznie czeka na elementy - nie używaj `waitForTimeout` bez potrzeby:

✅ **Dobrze:**
```typescript
await expect(page.getByTestId('result')).toBeVisible();
```

❌ **Źle:**
```typescript
await page.waitForTimeout(3000);
const result = await page.getByTestId('result');
```

### 4. Izoluj testy

Każdy test powinien być niezależny:

```typescript
test.beforeEach(async ({ page }) => {
  // Przygotuj czysty stan dla każdego testu
  await page.goto('/');
});
```

### 5. Używaj opisowych nazw testów

✅ **Dobrze:**
```typescript
test('should display error when login with invalid credentials', async ({ page }) => {
```

❌ **Źle:**
```typescript
test('test 1', async ({ page }) => {
```

## 🔒 Testowanie z autentykacją

### Opcja 1: Logowanie w każdym teście

```typescript
test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
});
```

### Opcja 2: Używanie stanu autentykacji (szybsze)

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');
  
  // Zapisz stan autentykacji
  await page.context().storageState({ path: 'auth.json' });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { storageState: 'auth.json' },
      dependencies: ['setup'],
    },
  ],
});
```

## 📊 Raportowanie

Playwright generuje automatyczne raporty:

```bash
# Pokaż raport HTML
npm run e2e:report

# Raport jest dostępny w:
playwright-report/index.html
```

Raport zawiera:
- Listę wszystkich testów
- Czas wykonania
- Screenshoty przy błędach
- Trace do debugowania
- Video nagrania (jeśli włączone)

## 🚨 Typowe problemy i rozwiązania

### Problem: Test czasami przechodzi, czasami nie (flaky test)

**Rozwiązanie:**
- Używaj `await expect()` zamiast ręcznego czekania
- Sprawdź, czy nie ma race conditions
- Upewnij się, że testy są izolowane

### Problem: Element nie jest znaleziony

**Rozwiązanie:**
```typescript
// Sprawdź, czy element jest widoczny
await expect(page.getByTestId('element')).toBeVisible();

// Poczekaj na element
await page.waitForSelector('[data-testid="element"]');
```

### Problem: Testy są wolne

**Rozwiązanie:**
- Używaj `fullyParallel: true` w konfiguracji
- Unikaj niepotrzebnych `waitForTimeout`
- Rozważ mockowanie API dla niektórych testów

## 📚 Dodatkowe zasoby

- [Dokumentacja Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## 🎯 Następne kroki

1. **Uruchom istniejące testy** - `npm run e2e`
2. **Przejrzyj Page Objects** - zobacz, jak są zbudowane
3. **Napisz swój pierwszy test** - zacznij od prostego scenariusza
4. **Dodaj selektory do nowych komponentów** - pamiętaj o `data-testid`
5. **Rozszerz testy** - dodaj więcej scenariuszy

---

**Powodzenia w testowaniu! 🚀**

Jeśli masz pytania lub napotkasz problemy, sprawdź dokumentację Playwright lub skonsultuj się z zespołem.

