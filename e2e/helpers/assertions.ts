/**
 * Custom Assertions for E2E Tests
 * 
 * These helpers provide reusable assertion functions
 */

import { type Page, expect } from '@playwright/test';

/**
 * Assert that the page has a specific title pattern
 */
export async function assertPageTitle(page: Page, titlePattern: string | RegExp) {
  await expect(page).toHaveTitle(titlePattern);
}

/**
 * Assert that user is on a specific URL
 */
export async function assertOnPage(page: Page, url: string) {
  await expect(page).toHaveURL(url);
}

/**
 * Assert that an element with test id is visible
 */
export async function assertElementVisible(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

/**
 * Assert that an element with test id is not visible
 */
export async function assertElementNotVisible(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).not.toBeVisible();
}

/**
 * Assert that an element contains specific text
 */
export async function assertElementContainsText(page: Page, testId: string, text: string) {
  await expect(page.getByTestId(testId)).toContainText(text);
}

/**
 * Assert that a button is disabled
 */
export async function assertButtonDisabled(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeDisabled();
}

/**
 * Assert that a button is enabled
 */
export async function assertButtonEnabled(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeEnabled();
}

/**
 * Assert that an error message is displayed
 */
export async function assertErrorDisplayed(page: Page, errorTestId: string = 'error-alert') {
  await expect(page.getByTestId(errorTestId)).toBeVisible();
}

/**
 * Assert that a success message is displayed
 */
export async function assertSuccessDisplayed(page: Page, successTestId: string = 'success-alert') {
  await expect(page.getByTestId(successTestId)).toBeVisible();
}

/**
 * Assert that a loading indicator is visible
 */
export async function assertLoadingVisible(page: Page, loadingTestId: string = 'loading') {
  await expect(page.getByTestId(loadingTestId)).toBeVisible();
}

/**
 * Assert that a loading indicator is not visible
 */
export async function assertLoadingNotVisible(page: Page, loadingTestId: string = 'loading') {
  await expect(page.getByTestId(loadingTestId)).not.toBeVisible();
}

/**
 * Assert that a form has validation errors
 */
export async function assertFormHasErrors(page: Page) {
  const errorElements = page.locator('[aria-invalid="true"]');
  await expect(errorElements.first()).toBeVisible();
}

/**
 * Assert that an input has a specific value
 */
export async function assertInputValue(page: Page, testId: string, value: string) {
  await expect(page.getByTestId(testId)).toHaveValue(value);
}

/**
 * Assert that a toast/notification is displayed
 */
export async function assertToastDisplayed(page: Page, message?: string) {
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible();
  
  if (message) {
    await expect(toast).toContainText(message);
  }
}

/**
 * Assert that the page is redirected after an action
 */
export async function assertRedirectedTo(page: Page, expectedUrl: string, timeout: number = 10000) {
  await page.waitForURL(expectedUrl, { timeout });
  await expect(page).toHaveURL(expectedUrl);
}

/**
 * Assert that a list has a specific number of items
 */
export async function assertListLength(page: Page, listTestId: string, expectedLength: number) {
  const items = page.getByTestId(listTestId);
  await expect(items).toHaveCount(expectedLength);
}

