/**
 * Authentication Helper Functions for E2E Tests
 *
 * These helpers simplify common authentication operations in tests
 */

import { type Page } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { RegisterPage } from "../pages/register.page";
import { generateUniqueEmail, generateValidPassword } from "./test-data";

/**
 * Login with provided credentials
 */
export async function login(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
}

/**
 * Login as a test user (requires test user to exist in database)
 * Uses credentials from .env.test:
 * - E2E_USERNAME
 * - E2E_PASSWORD
 */
export async function loginAsTestUser(page: Page) {
  const testEmail = process.env.E2E_USERNAME || "test@test.com";
  const testPassword = process.env.E2E_PASSWORD || "pass";

  await login(page, testEmail, testPassword);
}

/**
 * Register a new user with unique email
 */
export async function registerNewUser(page: Page): Promise<{ email: string; password: string }> {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  const email = generateUniqueEmail();
  const password = generateValidPassword();

  await registerPage.register(email, password, password);

  return { email, password };
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Note: Implement this based on your logout mechanism
  // This might involve clicking a logout button or clearing cookies
  await page.context().clearCookies();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check if we're on a protected page or if auth cookies exist
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => cookie.name.includes("auth") || cookie.name.includes("session"));
}

/**
 * Setup authenticated session for tests
 * This is useful for tests that don't need to test the login flow itself
 */
export async function setupAuthenticatedSession(page: Page) {
  // Option 1: Login normally
  await loginAsTestUser(page);

  // Option 2: Set cookies directly (faster, but requires knowing the cookie structure)
  // await page.context().addCookies([...]);
}

/**
 * Clear authentication state
 */
export async function clearAuthState(page: Page) {
  await page.context().clearCookies();
  await page.context().clearPermissions();
}
