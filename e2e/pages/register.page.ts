import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Register page
 * Encapsulates all interactions with the registration form
 */
export class RegisterPage {
  // Page locators
  readonly page: Page;
  readonly registerForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successMessage: Locator;
  readonly successAlert: Locator;
  readonly loginLink: Locator;
  readonly heading: Locator;
  readonly passwordRequirements: Locator;

  constructor(page: Page) {
    this.page = page;
    this.registerForm = page.getByTestId('register-form');
    this.emailInput = page.getByTestId('register-email-input');
    this.passwordInput = page.getByTestId('register-password-input');
    this.confirmPasswordInput = page.getByTestId('register-confirm-password-input');
    this.submitButton = page.getByTestId('register-submit-button');
    this.errorAlert = page.getByTestId('register-error-alert');
    this.successMessage = page.getByTestId('register-success-message');
    this.successAlert = page.getByTestId('register-success-alert');
    this.loginLink = page.getByTestId('login-link');
    this.heading = page.getByTestId('register-heading');
    this.passwordRequirements = page.getByTestId('password-requirements');
  }

  /**
   * Navigate to the register page
   */
  async goto() {
    await this.page.goto('/register');
  }

  /**
   * Assert that the register page is loaded
   */
  async assertLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.heading).toHaveText('Utwórz konto');
    await expect(this.registerForm).toBeVisible();
  }

  /**
   * Fill in the registration form
   */
  async fillRegisterForm(email: string, password: string, confirmPassword: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Submit the registration form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform a complete registration action
   */
  async register(email: string, password: string, confirmPassword: string = password) {
    await this.fillRegisterForm(email, password, confirmPassword);
    await this.submit();
  }

  /**
   * Assert that an error message is displayed
   */
  async assertErrorDisplayed() {
    await expect(this.errorAlert).toBeVisible();
  }

  /**
   * Assert that success message is displayed after registration
   */
  async assertSuccessMessageDisplayed() {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successAlert).toBeVisible();
  }

  /**
   * Assert that password requirements are visible
   */
  async assertPasswordRequirementsVisible() {
    await expect(this.passwordRequirements).toBeVisible();
  }

  /**
   * Assert that the submit button is disabled
   */
  async assertSubmitButtonDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Assert that the submit button is enabled
   */
  async assertSubmitButtonEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Click on the login link
   */
  async goToLogin() {
    await this.loginLink.click();
  }
}

