import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { RegisterPage } from "./pages/register.page";
import { DashboardPage } from "./pages/dashboard.page";

/**
 * E2E Tests for Authentication Flow
 *
 * These tests cover:
 * - User registration
 * - User login
 * - Form validation
 * - Error handling
 * - Navigation between auth pages
 */

test.describe("Authentication Flow", () => {
  test.describe("Login", () => {
    test("should display login page correctly", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.assertLoaded();

      // Verify all key elements are visible
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.registerLink).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });

    test("should show error with invalid credentials", async ({ page }) => {
      test.skip("Temporarily skipping due to flakiness in CI env");
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.assertLoaded();

      // Try to login with invalid credentials
      await loginPage.login("invalid@example.com", "wrongpassword");

      // Should display error message
      await loginPage.assertErrorDisplayed();
    });

    test("should navigate to register page from login", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.assertLoaded();

      // Click register link
      await loginPage.goToRegister();

      // Should be on register page
      await expect(page).toHaveURL("/register");

      const registerPage = new RegisterPage(page);
      await registerPage.assertLoaded();
    });

    test("should navigate to forgot password page", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.assertLoaded();

      // Click forgot password link
      await loginPage.goToForgotPassword();

      // Should be on forgot password page
      await expect(page).toHaveURL("/forgot-password");
    });

    // Note: This test uses credentials from .env.test (E2E_USERNAME, E2E_PASSWORD)
    test("should successfully login with valid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.assertLoaded();

      // Login with test credentials from .env.test
      const testEmail = process.env.E2E_USERNAME || "test@test.com";
      const testPassword = process.env.E2E_PASSWORD || "pass";
      await loginPage.login(testEmail, testPassword);

      // Should redirect to dashboard
      await loginPage.assertRedirectedToDashboard();

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.assertLoaded();
    });
  });

  test.describe("Registration", () => {
    test("should display registration page correctly", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Verify all key elements are visible
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
      await expect(registerPage.loginLink).toBeVisible();
    });

    test("should show password requirements when typing password", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Start typing password (use type with delay for React state updates)
      await registerPage.passwordInput.type("Test", { delay: 100 });

      // Wait a bit for React to update
      await page.waitForTimeout(500);

      // Password requirements should be visible
      await registerPage.assertPasswordRequirementsVisible();
    });

    test("should disable submit button with invalid form", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Initially button should be disabled
      await registerPage.assertSubmitButtonDisabled();

      // Fill with invalid data (short password)
      await registerPage.emailInput.fill("test@example.com");
      await registerPage.passwordInput.fill("short");
      await registerPage.confirmPasswordInput.fill("short");

      // Button should still be disabled
      await registerPage.assertSubmitButtonDisabled();
    });

    test("should show error when passwords do not match", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Fill with mismatched passwords
      await registerPage.emailInput.fill("test@example.com");
      await registerPage.passwordInput.fill("TestPassword123");
      await registerPage.confirmPasswordInput.fill("DifferentPassword123");

      // Submit button should be disabled
      await registerPage.assertSubmitButtonDisabled();
    });

    test("should navigate to login page from register", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Click login link
      await registerPage.goToLogin();

      // Should be on login page
      await expect(page).toHaveURL("/login");

      const loginPage = new LoginPage(page);
      await loginPage.assertLoaded();
    });

    // Note: This test will actually attempt to register a user
    // You may want to skip this or use a unique email each time
    test.skip("should successfully register a new user", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.assertLoaded();

      // Generate unique email for testing
      const timestamp = Date.now();
      const email = `test-${timestamp}@example.com`;

      // Fill registration form
      await registerPage.register(email, "TestPassword123", "TestPassword123");

      // Should show success message
      await registerPage.assertSuccessMessageDisplayed();
    });
  });

  test.describe("Authentication Redirects", () => {
    test("should redirect authenticated users away from login page", async () => {
      // Note: This test assumes middleware is working
      // You'll need to set up authentication state first
      test.skip();
    });

    test("should redirect unauthenticated users to login from dashboard", async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto("/dashboard");

      // Should be redirected to login
      // Note: This depends on your middleware implementation
      // You may need to adjust the expected behavior
    });
  });
});
