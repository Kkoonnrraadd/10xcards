import { type Page, expect } from "@playwright/test";

/**
 * Page Object Model for the Home page
 * Encapsulates all interactions with the landing/home page
 */
export class HomePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Assert that the home page is loaded
   */
  async assertLoaded() {
    await expect(this.page).toHaveTitle(/10x|cards|Astro/i);
  }

  /**
   * Navigate to login page from home
   */
  async goToLogin() {
    await this.page.goto("/login");
  }

  /**
   * Navigate to register page from home
   */
  async goToRegister() {
    await this.page.goto("/register");
  }
}
