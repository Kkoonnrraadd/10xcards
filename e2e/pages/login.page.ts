import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Login page
 * Encapsulates all interactions with the login form
 */
export class LoginPage {
  // Page locators
  readonly page: Page;
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginForm = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorAlert = page.getByTestId("login-error-alert");
    this.registerLink = page.getByTestId("register-link");
    this.forgotPasswordLink = page.getByTestId("forgot-password-link");
    this.heading = page.getByTestId("login-heading");
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Assert that the login page is loaded
   */
  async assertLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.heading).toHaveText("Zaloguj się");
    await expect(this.loginForm).toBeVisible();
  }

  /**
   * Fill in the login form
   */
  async fillLoginForm(email: string, password: string) {
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await this.page.waitForTimeout(500); // Wait for React state update
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    await this.page.waitForTimeout(500); // Wait for React state update
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform a complete login action
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submit();
    // Wait for the login request to complete and redirect to start
    await this.page.waitForTimeout(1000);
  }

  /**
   * Assert that an error message is displayed
   */
  async assertErrorDisplayed() {
    await expect(this.errorAlert).toBeVisible();
  }

  /**
   * Assert that the user is redirected to dashboard after successful login
   */
  async assertRedirectedToDashboard() {
    await this.page.waitForURL("/dashboard", { timeout: 10000 });
    await expect(this.page).toHaveURL("/dashboard");
  }

  /**
   * Click on the register link
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Click on the forgot password link
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
