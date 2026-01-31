# 🎓 Zaawansowane techniki testowania E2E

## Spis treści

1. [Testowanie z autentykacją](#testowanie-z-autentykacją)
2. [Mockowanie API](#mockowanie-api)
3. [Testowanie z bazą danych](#testowanie-z-bazą-danych)
4. [Testy równoległe](#testy-równoległe)
5. [Visual Regression Testing](#visual-regression-testing)
6. [Testowanie responsywności](#testowanie-responsywności)
7. [Testowanie dostępności](#testowanie-dostępności)
8. [CI/CD Integration](#cicd-integration)

---

## Testowanie z autentykacją

### Metoda 1: Logowanie w każdym teście

Najprostsza metoda, ale wolniejsza:

```typescript
test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test("authenticated test", async ({ page }) => {
  // Test wykonuje się jako zalogowany użytkownik
});
```

### Metoda 2: Współdzielenie stanu autentykacji (ZALECANE)

Szybsza metoda - logowanie raz, używanie w wielu testach:

```typescript
// auth.setup.ts
import { test as setup } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("test@example.com", "TestPassword123!");

  // Zapisz stan autentykacji
  await page.context().storageState({ path: authFile });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],
});
```

### Metoda 3: Bezpośrednie ustawianie cookies

Najszybsza metoda, wymaga znajomości struktury cookies:

```typescript
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "auth-token",
      value: "your-auth-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
});
```

---

## Mockowanie API

### Dlaczego mockować API?

- ⚡ **Szybsze testy** - nie czekasz na prawdziwe API
- 🎯 **Kontrola scenariuszy** - możesz testować błędy, edge cases
- 💰 **Oszczędność** - nie zużywasz limitów API (np. OpenAI)
- 🔒 **Izolacja** - testy nie zależą od zewnętrznych serwisów

### Podstawowe mockowanie

```typescript
test("should handle API error", async ({ page }) => {
  // Przechwytuj żądania do API
  await page.route("**/api/flashcards/generate", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Internal Server Error" },
      }),
    });
  });

  // Teraz test może sprawdzić obsługę błędu
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.generateFlashcards(VALID_TEXT);

  // Powinien pokazać błąd
  await expect(page.getByTestId("error-alert")).toBeVisible();
});
```

### Mockowanie z danymi testowymi

```typescript
test("should display generated flashcards", async ({ page }) => {
  // Mock API z predefiniowanymi danymi
  await page.route("**/api/flashcards/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          { front: "Pytanie 1", back: "Odpowiedź 1" },
          { front: "Pytanie 2", back: "Odpowiedź 2" },
        ],
      }),
    });
  });

  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.generateFlashcards(VALID_TEXT);

  // Sprawdź, czy wyświetlają się zmockowane dane
  const count = await dashboard.getReviewCardsCount();
  expect(count).toBe(2);
});
```

### Warunkowe mockowanie

```typescript
// Mock tylko dla testów, nie dla rzeczywistych wywołań
test.beforeEach(async ({ page }) => {
  if (process.env.MOCK_API === "true") {
    await page.route("**/api/**", async (route) => {
      // Twoja logika mockowania
    });
  }
});
```

---

## Testowanie z bazą danych

### Strategia 1: Dedykowana baza testowa

```typescript
// Użyj osobnej bazy danych dla testów
// .env.test
DATABASE_URL=postgresql://localhost:5432/test_db
```

### Strategia 2: Fixtures i seeding

```typescript
// test-fixtures.ts
export async function seedTestData() {
  // Dodaj testowe dane do bazy
  await db.users.create({
    email: "test@example.com",
    password: "hashed_password",
  });
}

export async function cleanupTestData() {
  // Wyczyść dane testowe
  await db.users.deleteMany({
    email: { startsWith: "test-" },
  });
}

// W testach
test.beforeEach(async () => {
  await seedTestData();
});

test.afterEach(async () => {
  await cleanupTestData();
});
```

### Strategia 3: Transakcje (rollback po teście)

```typescript
test.beforeEach(async () => {
  await db.$transaction.begin();
});

test.afterEach(async () => {
  await db.$transaction.rollback();
});
```

---

## Testy równoległe

### Konfiguracja równoległości

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true, // Wszystkie testy równolegle
  workers: 4, // Liczba workerów
});
```

### Izolacja testów

```typescript
// Każdy test powinien być niezależny
test("test 1", async ({ page }) => {
  // Własny setup
  await page.goto("/");
  // Test
});

test("test 2", async ({ page }) => {
  // Własny setup (nie zakłada stanu z test 1)
  await page.goto("/");
  // Test
});
```

### Grupowanie testów

```typescript
// Testy w tej grupie będą wykonywane sekwencyjnie
test.describe.serial("sequential tests", () => {
  test("step 1", async ({ page }) => {
    // ...
  });

  test("step 2", async ({ page }) => {
    // Zakłada, że step 1 się wykonał
  });
});
```

---

## Visual Regression Testing

### Podstawowe porównanie

```typescript
test("visual regression", async ({ page }) => {
  await page.goto("/login");

  // Porównaj z bazowym screenshotem
  await expect(page).toHaveScreenshot("login-page.png");
});
```

### Generowanie bazowych screenshotów

```bash
# Wygeneruj nowe bazowe screenshoty
npx playwright test --update-snapshots
```

### Konfiguracja tolerancji

```typescript
await expect(page).toHaveScreenshot("page.png", {
  maxDiffPixels: 100, // Maksymalna różnica w pikselach
  threshold: 0.2, // Próg różnicy (0-1)
  fullPage: true, // Cała strona, nie tylko viewport
});
```

### Ignorowanie dynamicznych elementów

```typescript
await expect(page).toHaveScreenshot("page.png", {
  mask: [
    page.locator(".timestamp"), // Ukryj timestamp
    page.locator(".random-ad"), // Ukryj reklamy
  ],
});
```

---

## Testowanie responsywności

### Test na różnych rozmiarach ekranu

```typescript
test("mobile view", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  // Sprawdź mobile menu
  await expect(page.getByTestId("mobile-menu")).toBeVisible();
});

test("desktop view", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");

  // Sprawdź desktop navigation
  await expect(page.getByTestId("desktop-nav")).toBeVisible();
});
```

### Użycie predefiniowanych urządzeń

```typescript
import { devices } from "@playwright/test";

test("iPhone 12", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 12"],
  });
  const page = await context.newPage();

  await page.goto("/");
  // Test na iPhone 12
});
```

### Konfiguracja projektów dla różnych urządzeń

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "Tablet",
      use: { ...devices["iPad Pro"] },
    },
  ],
});
```

---

## Testowanie dostępności

### Podstawowe testy accessibility

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("should not have accessibility violations", async ({ page }) => {
  await page.goto("/login");

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Testowanie nawigacji klawiaturą

```typescript
test("keyboard navigation", async ({ page }) => {
  await page.goto("/login");

  // Tab przez formularz
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("email-input")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByTestId("password-input")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByTestId("submit-button")).toBeFocused();

  // Enter na przycisku
  await page.keyboard.press("Enter");
});
```

### Testowanie screen readerów

```typescript
test("screen reader labels", async ({ page }) => {
  await page.goto("/login");

  // Sprawdź aria-label
  const emailInput = page.getByTestId("email-input");
  await expect(emailInput).toHaveAttribute("aria-label", "Email address");

  // Sprawdź role
  const form = page.getByTestId("login-form");
  await expect(form).toHaveAttribute("role", "form");
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.40.0
  script:
    - npm ci
    - npm run build
    - npm run e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 30 days
```

### Docker

```dockerfile
# Dockerfile.test
FROM mcr.microsoft.com/playwright:v1.40.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD ["npm", "run", "e2e"]
```

---

## Najlepsze praktyki zaawansowane

### 1. Custom Fixtures

```typescript
// fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

type MyFixtures = {
  loginPage: LoginPage;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  authenticatedPage: async ({ page }, use) => {
    // Automatycznie zaloguj
    await loginAsTestUser(page);
    await use(page);
  },
});

// W testach
test("use fixture", async ({ authenticatedPage }) => {
  // authenticatedPage jest już zalogowana
  await authenticatedPage.goto("/dashboard");
});
```

### 2. Retry Logic

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0, // 2 retry w CI, 0 lokalnie
});

// Lub dla konkretnego testu
test("flaky test", async ({ page }) => {
  test.fixme(); // Oznacz jako znany problem
  // lub
  test.slow(); // Oznacz jako wolny test (3x timeout)
});
```

### 3. Test Tagging

```typescript
test("critical user flow @smoke @critical", async ({ page }) => {
  // Test oznaczony tagami
});

// Uruchom tylko testy smoke
// npx playwright test --grep @smoke

// Uruchom wszystkie oprócz slow
// npx playwright test --grep-invert @slow
```

### 4. Performance Testing

```typescript
test("page load performance", async ({ page }) => {
  const startTime = Date.now();

  await page.goto("/dashboard");

  const loadTime = Date.now() - startTime;

  // Sprawdź, czy strona ładuje się szybko
  expect(loadTime).toBeLessThan(3000); // 3 sekundy

  // Lub użyj Performance API
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType("navigation")[0];
    return {
      loadTime: perf.loadEventEnd - perf.loadEventStart,
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
    };
  });

  expect(metrics.loadTime).toBeLessThan(2000);
});
```

---

## Podsumowanie

Te zaawansowane techniki pozwolą Ci:

- ⚡ Przyspieszyć testy
- 🎯 Zwiększyć pokrycie testowe
- 🔒 Poprawić izolację testów
- 🚀 Zintegrować z CI/CD
- 📊 Monitorować wydajność

Pamiętaj: Nie wszystkie techniki są potrzebne od razu. Zaczynaj od prostych testów i stopniowo dodawaj zaawansowane funkcje, gdy jest to potrzebne.
