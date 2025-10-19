# 🚀 E2E Testing Cheatsheet

## 📋 Szybki dostęp do najważniejszych informacji

---

## ⌨️ Komendy

```bash
# Podstawowe
npm run e2e                           # Uruchom wszystkie testy
npm run e2e:headed                    # Z widoczną przeglądarką
npm run e2e:report                    # Pokaż raport HTML

# Konkretne testy
npx playwright test e2e/auth.spec.ts  # Jeden plik
npx playwright test -g "login"        # Testy zawierające "login"
npx playwright test --grep @smoke     # Testy z tagiem @smoke

# Debugowanie
npx playwright test --debug           # Tryb debug
npx playwright test --headed --slowmo=1000  # Wolne wykonanie
npx playwright show-trace trace.zip   # Otwórz trace viewer

# Screenshoty
npx playwright test --update-snapshots  # Zaktualizuj bazowe screenshoty

# UI Mode (interaktywny)
npx playwright test --ui              # Otwórz UI mode
```

---

## 🎯 Podstawowe wzorce testów

### Struktura testu
```typescript
test('opis testu', async ({ page }) => {
  // Arrange - przygotuj
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  // Act - wykonaj
  await loginPage.login('user@test.com', 'pass123');
  
  // Assert - sprawdź
  await expect(page).toHaveURL('/dashboard');
});
```

### Test z beforeEach
```typescript
test.describe('Group', () => {
  test.beforeEach(async ({ page }) => {
    // Setup przed każdym testem
    await page.goto('/');
  });
  
  test('test 1', async ({ page }) => {
    // Test
  });
});
```

### Test z skip/only
```typescript
test.skip('pomijany test', async ({ page }) => {
  // Ten test nie będzie wykonany
});

test.only('tylko ten test', async ({ page }) => {
  // Tylko ten test będzie wykonany
});
```

---

## 🔍 Selektory

### Preferowane (w kolejności)
```typescript
// 1. data-testid (NAJLEPSZE)
page.getByTestId('login-button')

// 2. Role
page.getByRole('button', { name: 'Login' })

// 3. Label
page.getByLabel('Email address')

// 4. Placeholder
page.getByPlaceholder('Enter email')

// 5. Text
page.getByText('Welcome back')
```

### Unikaj
```typescript
// ❌ CSS selektory (kruche)
page.locator('.btn-primary')
page.locator('#submit-btn')

// ❌ XPath (nieczytelne)
page.locator('//button[@class="submit"]')
```

---

## ✅ Asercje

### Widoczność
```typescript
await expect(element).toBeVisible()
await expect(element).toBeHidden()
await expect(element).not.toBeVisible()
```

### Tekst
```typescript
await expect(element).toHaveText('Hello')
await expect(element).toContainText('Hello')
await expect(element).toHaveText(/hello/i)  // regex
```

### Wartość
```typescript
await expect(input).toHaveValue('test@test.com')
await expect(input).toBeEmpty()
```

### Stan
```typescript
await expect(button).toBeEnabled()
await expect(button).toBeDisabled()
await expect(checkbox).toBeChecked()
```

### URL
```typescript
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveURL(/dashboard/)
await expect(page).toHaveTitle('Dashboard')
```

### Liczba elementów
```typescript
await expect(page.getByTestId('card')).toHaveCount(5)
```

---

## 🎬 Akcje

### Kliknięcia
```typescript
await button.click()
await button.dblclick()
await button.click({ button: 'right' })  // prawy przycisk
```

### Wypełnianie pól
```typescript
await input.fill('text')
await input.clear()
await input.type('text', { delay: 100 })  // wolne pisanie
```

### Klawiatura
```typescript
await page.keyboard.press('Enter')
await page.keyboard.press('Control+A')
await page.keyboard.type('Hello')
```

### Hover
```typescript
await element.hover()
```

### Select
```typescript
await select.selectOption('value')
await select.selectOption({ label: 'Option 1' })
```

### Upload pliku
```typescript
await input.setInputFiles('path/to/file.pdf')
await input.setInputFiles(['file1.pdf', 'file2.pdf'])
```

---

## 🔄 Czekanie

### Auto-waiting (preferowane)
```typescript
// Playwright automatycznie czeka
await page.getByTestId('button').click()
await expect(element).toBeVisible()
```

### Ręczne czekanie (rzadko potrzebne)
```typescript
// Czekaj na element
await page.waitForSelector('[data-testid="result"]')

// Czekaj na URL
await page.waitForURL('/dashboard')

// Czekaj na load state
await page.waitForLoadState('networkidle')

// Czekaj na funkcję
await page.waitForFunction(() => window.data.loaded)

// ❌ Unikaj (tylko w ostateczności)
await page.waitForTimeout(1000)
```

---

## 📸 Screenshots i Video

### Screenshot
```typescript
// Cała strona
await page.screenshot({ path: 'screenshot.png' })

// Pełna strona (z scrollowaniem)
await page.screenshot({ path: 'full.png', fullPage: true })

// Konkretny element
await element.screenshot({ path: 'element.png' })
```

### Video
```typescript
// W konfiguracji
use: {
  video: 'on',  // zawsze
  video: 'retain-on-failure',  // tylko przy błędzie
  video: 'on-first-retry',  // przy pierwszym retry
}
```

---

## 🎭 Mockowanie API

### Podstawowe mockowanie
```typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ users: [] }),
  });
});
```

### Modyfikacja response
```typescript
await page.route('**/api/data', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.modified = true;
  await route.fulfill({ json });
});
```

### Abort request
```typescript
await page.route('**/*.{png,jpg,jpeg}', route => route.abort());
```

---

## 🔐 Autentykacja

### Logowanie w teście
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email').fill('test@test.com');
  await page.getByTestId('password').fill('password');
  await page.getByTestId('submit').click();
  await page.waitForURL('/dashboard');
});
```

### Współdzielenie stanu (szybsze)
```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  // ... login
  await page.context().storageState({ path: 'auth.json' });
});

// playwright.config.ts
use: {
  storageState: 'auth.json',
}
```

---

## 🐛 Debugowanie

### Pause test
```typescript
await page.pause()  // Otwiera Playwright Inspector
```

### Console logs
```typescript
page.on('console', msg => console.log(msg.text()))
```

### Network logs
```typescript
page.on('request', request => 
  console.log('>>', request.method(), request.url())
)
page.on('response', response =>
  console.log('<<', response.status(), response.url())
)
```

### Evaluate w kontekście strony
```typescript
const result = await page.evaluate(() => {
  return window.myGlobalVariable;
});
```

---

## 📱 Responsywność

### Viewport
```typescript
await page.setViewportSize({ width: 375, height: 667 })
```

### Emulacja urządzenia
```typescript
import { devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });
```

---

## 🎨 Page Object Model

### Struktura
```typescript
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email');
    this.passwordInput = page.getByTestId('password');
    this.submitButton = page.getByTestId('submit');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async assertLoaded() {
    await expect(this.emailInput).toBeVisible();
  }
}
```

### Użycie
```typescript
test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'pass123');
});
```

---

## 🏷️ Konwencje nazewnictwa

### data-testid
```
{komponent}-{element}-{typ}

Przykłady:
- login-email-input
- register-submit-button
- flashcard-generator
- accept-card-button
- error-alert
```

### Testy
```typescript
// ✅ Opisowe
test('should display error when login with invalid credentials')

// ❌ Niejasne
test('test1')
```

### Grupy testów
```typescript
test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('successful login', ...)
    test('failed login', ...)
  })
  
  test.describe('Register', () => {
    test('successful registration', ...)
  })
})
```

---

## ⚙️ Konfiguracja

### playwright.config.ts
```typescript
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

---

## 🎯 Najlepsze praktyki

### ✅ DO
- Używaj `data-testid` dla stabilności
- Pisz niezależne testy
- Używaj Page Object Models
- Testuj zachowanie, nie implementację
- Używaj auto-waiting Playwright

### ❌ DON'T
- Nie używaj `waitForTimeout` bez potrzeby
- Nie testuj szczegółów implementacji
- Nie twórz zależności między testami
- Nie używaj kruchych selektorów CSS
- Nie duplikuj kodu - używaj Page Objects

---

## 📚 Przydatne linki

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

## 🆘 Szybka pomoc

### Test nie przechodzi?
1. Uruchom z `--headed` aby zobaczyć co się dzieje
2. Dodaj `await page.pause()` przed problematycznym krokiem
3. Sprawdź `playwright-report/` dla szczegółów
4. Użyj `npx playwright show-trace trace.zip`

### Element nie znaleziony?
1. Sprawdź czy `data-testid` jest poprawny
2. Użyj `page.locator('[data-testid="..."]').count()` aby sprawdzić ile jest elementów
3. Sprawdź czy element nie jest w iframe
4. Użyj Playwright Inspector do inspekcji

### Test jest flaky (niestabilny)?
1. Używaj `await expect()` zamiast ręcznego czekania
2. Sprawdź czy nie ma race conditions
3. Upewnij się że testy są izolowane
4. Dodaj `test.slow()` jeśli test jest wolny

---

**Zapisz ten plik jako zakładkę! 📌**

