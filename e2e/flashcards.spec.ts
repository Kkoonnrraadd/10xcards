import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/dashboard.page";
import { LoginPage } from "./pages/login.page";

/**
 * E2E Tests for Flashcard Generation and Management
 *
 * These tests cover:
 * - Flashcard generation from text
 * - Reviewing generated flashcards
 * - Accepting/rejecting flashcards
 * - Editing flashcards
 * - Validation of text length
 */

// Sample text for testing (1000+ characters)
const VALID_SOURCE_TEXT = `
Sztuczna inteligencja (AI) to dziedzina informatyki zajmująca się tworzeniem systemów zdolnych do wykonywania zadań wymagających ludzkiej inteligencji. Obejmuje to uczenie maszynowe, przetwarzanie języka naturalnego, rozpoznawanie obrazów i wiele innych obszarów.

Uczenie maszynowe jest kluczowym elementem AI, umożliwiającym systemom uczenie się na podstawie danych bez bezpośredniego programowania. Istnieją trzy główne typy uczenia maszynowego: nadzorowane, nienadzorowane i ze wzmocnieniem.

W uczeniu nadzorowanym model jest trenowany na oznaczonych danych, gdzie każdy przykład ma przypisaną poprawną odpowiedź. Model uczy się mapowania między danymi wejściowymi a wyjściowymi.

Uczenie nienadzorowane polega na znajdowaniu wzorców w danych bez etykiet. Algorytmy grupowania i redukcji wymiarowości są przykładami tego podejścia.

Uczenie ze wzmocnieniem to metoda, w której agent uczy się podejmować decyzje poprzez interakcję ze środowiskiem, otrzymując nagrody lub kary za swoje działania.

Sieci neuronowe to modele inspirowane strukturą ludzkiego mózgu, składające się z warstw połączonych neuronów. Głębokie sieci neuronowe, zawierające wiele warstw ukrytych, są podstawą głębokiego uczenia.
`.trim();

const SHORT_TEXT = "To jest za krótki tekst do wygenerowania fiszek.";

test.describe("Flashcard Generation", () => {
  // Setup: Login before each test in this group
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.E2E_USERNAME || "test@test.com";
    const testPassword = process.env.E2E_PASSWORD || "pass";

    // Login using LoginPage (with proper delays for React state updates)
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testEmail, testPassword);
    await loginPage.assertRedirectedToDashboard();
  });

  test.describe("Generator UI", () => {
    test("should display flashcard generator on dashboard", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      // User is already logged in from beforeEach
      // Just verify we're on dashboard
      await page.goto("/dashboard");

      // Verify generator is visible
      await expect(dashboardPage.flashcardGenerator).toBeVisible();
      await expect(dashboardPage.generatorHeading).toBeVisible();
      await expect(dashboardPage.sourceTextInput).toBeVisible();
      await expect(dashboardPage.generateButton).toBeVisible();
    });

    test("should show character counter", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Type some text
      await dashboardPage.fillSourceText("Test text");

      // Character counter should be visible
      await expect(dashboardPage.characterCounter).toBeVisible();
      await expect(dashboardPage.characterCounter).toContainText("9");
    });

    test("should show error for text that is too short", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Fill with short text
      await dashboardPage.fillSourceText(SHORT_TEXT);

      // Error should be visible
      await dashboardPage.assertTextLengthErrorVisible();

      // Generate button should be disabled
      await expect(dashboardPage.generateButton).toBeDisabled();
    });
  });

  test.describe("Generation Process", () => {
    // Note: These tests will make actual API calls to generate flashcards
    // You may want to mock the API or use test fixtures

    test.skip("should generate flashcards from valid text", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);

      // Should show loading state
      await dashboardPage.assertGenerationInProgress();

      // Wait for generation to complete and reviewer to appear
      await dashboardPage.assertReviewerVisible();

      // Should have at least one candidate
      const count = await dashboardPage.getReviewCardsCount();
      expect(count).toBeGreaterThan(0);
    });

    test.skip("should display generated flashcard candidates", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);

      // Wait for reviewer
      await dashboardPage.assertReviewerVisible();

      // Verify card structure
      const cardContent = await dashboardPage.getCardContent(0);
      expect(cardContent.front).toBeTruthy();
      expect(cardContent.back).toBeTruthy();
    });
  });

  test.describe("Flashcard Review", () => {
    // These tests assume flashcards have been generated
    // You may want to set up test fixtures or use beforeEach

    test.skip("should accept a flashcard candidate", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Get initial count
      const initialCount = await dashboardPage.getReviewCardsCount();

      // Accept first card
      await dashboardPage.acceptFirstCard();

      // Wait a bit for the action to complete
      await page.waitForTimeout(1000);

      // Count should decrease
      const newCount = await dashboardPage.getReviewCardsCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test.skip("should reject a flashcard candidate", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Get initial count
      const initialCount = await dashboardPage.getReviewCardsCount();

      // Reject first card
      await dashboardPage.rejectFirstCard();

      // Wait a bit for the action to complete
      await page.waitForTimeout(1000);

      // Count should decrease
      const newCount = await dashboardPage.getReviewCardsCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test.skip("should accept all flashcard candidates", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Accept all cards
      await dashboardPage.acceptAllCards();

      // Wait for completion
      await page.waitForTimeout(2000);

      // Should show review complete message
      await dashboardPage.assertReviewComplete();
    });

    test.skip("should reject all flashcard candidates", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Reject all cards
      await dashboardPage.rejectAllCards();

      // Wait for completion
      await page.waitForTimeout(2000);

      // Should return to generator
      await expect(dashboardPage.flashcardGenerator).toBeVisible();
    });

    test.skip("should return to generator after completing review", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Accept all cards
      await dashboardPage.acceptAllCards();

      // Wait for completion
      await page.waitForTimeout(2000);

      // Click generate more
      await dashboardPage.clickGenerateMore();

      // Should be back to generator
      await expect(dashboardPage.flashcardGenerator).toBeVisible();
    });
  });

  test.describe("Flashcard Actions", () => {
    test.skip("should open edit dialog when clicking edit button", async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Generate flashcards first
      await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
      await dashboardPage.assertReviewerVisible();

      // Click edit on first card
      await dashboardPage.editFirstCard();

      // Edit dialog should be visible
      // Note: You'll need to add selectors for the edit dialog
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });
});

test.describe("Complete Flashcard Workflow", () => {
  test.skip("should complete full workflow from login to flashcard generation", async ({ page }) => {
    // 1. Login with credentials from .env.test
    const testEmail = process.env.E2E_USERNAME || "test@test.com";
    const testPassword = process.env.E2E_PASSWORD || "pass";

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testEmail, testPassword);

    // 2. Should be on dashboard
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.assertLoaded();

    // 3. Generate flashcards
    await dashboardPage.generateFlashcards(VALID_SOURCE_TEXT);
    await dashboardPage.assertReviewerVisible();

    // 4. Review and accept some cards
    await dashboardPage.acceptFirstCard();
    await page.waitForTimeout(1000);

    await dashboardPage.acceptFirstCard();
    await page.waitForTimeout(1000);

    // 5. Reject remaining
    const remainingCount = await dashboardPage.getReviewCardsCount();
    if (remainingCount > 0) {
      await dashboardPage.rejectAllCards();
    }

    // 6. Should be back to generator or show complete message
    await expect(dashboardPage.flashcardGenerator).toBeVisible();
  });
});
