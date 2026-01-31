import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { RegisterPage } from "./pages/register.page";

/**
 * Example E2E Tests - Quick Start
 * 
 * These are simple tests you can run immediately to verify your setup.
 * They don't require authentication or database setup.
 */

test.describe("Quick Start Examples", () => {
  test("should load login page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertLoaded();
    
    // Take a screenshot for visual verification
    await expect(page).toHaveScreenshot("login-page.png", { 
      maxDiffPixels: 100 
    });
  });

  test("should load register page", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.assertLoaded();
    
    // Verify all form elements are present
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test("should navigate between login and register pages", async ({ page }) => {
    // Start on login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertLoaded();
    
    // Click register link
    await loginPage.goToRegister();
    
    // Should be on register page
    const registerPage = new RegisterPage(page);
    await registerPage.assertLoaded();
    
    // Go back to login
    await registerPage.goToLogin();
    await loginPage.assertLoaded();
  });

  test("should show password requirements when typing", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    
    // Password requirements should not be visible initially
    await expect(registerPage.passwordRequirements).not.toBeVisible();
    
    // Start typing password (use type with delay for React state updates)
    await registerPage.passwordInput.type("Test", { delay: 100 });
    
    // Wait a bit for React to update
    await page.waitForTimeout(500);
    
    // Password requirements should now be visible
    await registerPage.assertPasswordRequirementsVisible();
  });

  test("should disable submit button with invalid form data", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    
    // Button should be disabled initially
    await registerPage.assertSubmitButtonDisabled();
    
    // Fill with short password
    await registerPage.emailInput.fill("test@example.com");
    await registerPage.passwordInput.fill("short");
    
    // Button should still be disabled
    await registerPage.assertSubmitButtonDisabled();
  });

  test("should show validation for mismatched passwords", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    
    // Fill with mismatched passwords
    await registerPage.passwordInput.fill("Password123");
    await registerPage.confirmPasswordInput.fill("DifferentPassword123");
    
    // Submit button should be disabled
    await registerPage.assertSubmitButtonDisabled();
  });
});

test.describe("Visual Regression Tests", () => {
  test("login page visual snapshot", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertLoaded();
    
    // Compare with baseline screenshot
    await expect(page).toHaveScreenshot("login-visual.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("register page visual snapshot", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.assertLoaded();
    
    // Compare with baseline screenshot
    await expect(page).toHaveScreenshot("register-visual.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

