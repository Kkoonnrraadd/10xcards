# 🔐 Konfiguracja Autentykacji dla Testów E2E

## 📋 Przegląd

Testy E2E wymagające autentykacji używają zmiennych środowiskowych z pliku `.env.test` do logowania testowego użytkownika.

---

## 🔑 Zmienne środowiskowe

W pliku `.env.test` masz skonfigurowane:

```bash
# Supabase Configuration
SUPABASE_URL="https://123.supabase.co"
SUPABASE_ANON_KEY="1234"

# Test User Credentials
E2E_USERNAME_ID="4-32"
E2E_USERNAME="test@test.com"
E2E_PASSWORD="pass"
```

### Wymagane zmienne:
- **`E2E_USERNAME`** - email testowego użytkownika
- **`E2E_PASSWORD`** - hasło testowego użytkownika

### Opcjonalne zmienne:
- **`E2E_USERNAME_ID`** - ID użytkownika (jeśli potrzebne)
- **`SUPABASE_URL`** - URL Supabase (dla testów API)
- **`SUPABASE_ANON_KEY`** - klucz Supabase (dla testów API)

---

## 🎯 Jak to działa?

### 1. Automatyczne logowanie w testach

Testy dashboard automatycznie logują użytkownika przed każdym testem:

```typescript
test.beforeEach(async ({ page }) => {
  const testEmail = process.env.E2E_USERNAME || "test@test.com";
  const testPassword = process.env.E2E_PASSWORD || "pass";
  
  // Login
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(testEmail);
  await page.getByTestId("login-password-input").fill(testPassword);
  await page.getByTestId("login-submit-button").click();
  
  // Wait for redirect
  await page.waitForURL("/dashboard");
});
```

### 2. Helper funkcja

Możesz też użyć helpera `loginAsTestUser()`:

```typescript
import { loginAsTestUser } from './helpers/auth-helpers';

test('my test', async ({ page }) => {
  await loginAsTestUser(page);
  // User is now logged in
});
```

---

## 🛠️ Setup testowego użytkownika

### Opcja 1: Użyj istniejącego użytkownika

Jeśli masz już użytkownika w bazie danych:

1. Otwórz `.env.test`
2. Ustaw `E2E_USERNAME` na email użytkownika
3. Ustaw `E2E_PASSWORD` na hasło użytkownika

### Opcja 2: Utwórz nowego użytkownika testowego

#### Przez aplikację:
1. Uruchom `npm run dev`
2. Przejdź do `/register`
3. Zarejestruj użytkownika z danymi:
   - Email: `test@test.com`
   - Hasło: `pass` (lub inne)
4. Potwierdź email (jeśli wymagane)
5. Zaktualizuj `.env.test` z tymi danymi

#### Przez Supabase:
1. Otwórz Supabase Dashboard
2. Przejdź do Authentication → Users
3. Dodaj nowego użytkownika:
   - Email: `test@test.com`
   - Password: `pass`
4. Zaktualizuj `.env.test`

---

## 📝 Przykłady użycia

### Test z automatycznym logowaniem

```typescript
test.describe("Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const testEmail = process.env.E2E_USERNAME || "test@test.com";
    const testPassword = process.env.E2E_PASSWORD || "pass";
    
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(testEmail);
    await page.getByTestId("login-password-input").fill(testPassword);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("/dashboard");
  });

  test("should access dashboard", async ({ page }) => {
    // User is already logged in
    await expect(page).toHaveURL("/dashboard");
  });
});
```

### Test z helper funkcją

```typescript
import { loginAsTestUser } from './helpers/auth-helpers';

test("should generate flashcards", async ({ page }) => {
  // Login using helper
  await loginAsTestUser(page);
  
  // Navigate to dashboard
  await page.goto("/dashboard");
  
  // Test flashcard generation
  // ...
});
```

---

## 🔒 Bezpieczeństwo

### ✅ Dobre praktyki:

1. **NIE commituj `.env.test`** do repozytorium
   - Plik jest w `.gitignore`
   - Zawiera wrażliwe dane

2. **Używaj dedykowanego użytkownika testowego**
   - Nie używaj prawdziwych kont użytkowników
   - Użytkownik testowy powinien mieć minimalne uprawnienia

3. **Różne środowiska**
   - Używaj osobnej bazy danych dla testów
   - Konfiguruj przez `SUPABASE_URL` w `.env.test`

### ❌ Czego unikać:

- ❌ Nie hardcoduj credentials w testach
- ❌ Nie używaj produkcyjnych kont
- ❌ Nie commituj `.env.test` do git

---

## 🐛 Troubleshooting

### Problem: "Invalid login credentials"

**Rozwiązanie:**
1. Sprawdź czy użytkownik istnieje w bazie danych
2. Zweryfikuj email i hasło w `.env.test`
3. Sprawdź czy email został potwierdzony (jeśli wymagane)

### Problem: "User not found"

**Rozwiązanie:**
1. Utwórz użytkownika testowego (zobacz sekcję Setup)
2. Upewnij się, że używasz właściwej bazy danych

### Problem: Testy timeout podczas logowania

**Rozwiązanie:**
1. Sprawdź czy serwer działa (`npm run dev`)
2. Sprawdź czy URL w `.env.test` jest poprawny
3. Zwiększ timeout w konfiguracji Playwright

---

## 📊 Które testy wymagają autentykacji?

### ✅ Wymagają logowania:
- `e2e/flashcards.spec.ts` - wszystkie testy dashboard
- `e2e/auth.spec.ts` - test "should successfully login"
- Przyszłe testy funkcji wymagających autentykacji

### ❌ NIE wymagają logowania:
- `e2e/example.spec.ts` - podstawowe testy UI
- `e2e/auth.spec.ts` - większość testów formularzy
- `e2e/home.spec.ts` - test strony głównej

---

## 🎓 Best Practices

### 1. Używaj beforeEach dla grup testów

```typescript
test.describe("Protected Features", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  // All tests in this group will be authenticated
});
```

### 2. Wyloguj się po testach (jeśli potrzebne)

```typescript
test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

### 3. Sprawdzaj stan autentykacji

```typescript
test("should be authenticated", async ({ page }) => {
  await loginAsTestUser(page);
  
  // Verify authentication
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard");
});
```

---

## 📚 Dodatkowe zasoby

- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- `e2e/helpers/auth-helpers.ts` - helper funkcje
- `e2e/ADVANCED_TECHNIQUES.md` - zaawansowane techniki autentykacji

---

## ✅ Checklist

Przed uruchomieniem testów wymagających autentykacji:

- [ ] Plik `.env.test` istnieje
- [ ] `E2E_USERNAME` jest ustawiony
- [ ] `E2E_PASSWORD` jest ustawiony
- [ ] Użytkownik testowy istnieje w bazie danych
- [ ] Email użytkownika jest potwierdzony (jeśli wymagane)
- [ ] Serwer działa (`npm run dev`)

---

**Gotowe! Możesz teraz uruchamiać testy wymagające autentykacji! 🚀**

```bash
# Uruchom testy dashboard
npm run e2e -- e2e/flashcards.spec.ts

# Uruchom test logowania
npm run e2e -- e2e/auth.spec.ts -g "should successfully login"
```

