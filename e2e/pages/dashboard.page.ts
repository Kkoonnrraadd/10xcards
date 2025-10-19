import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Dashboard page
 * Encapsulates all interactions with the flashcard generator and reviewer
 */
export class DashboardPage {
  // Page locators
  readonly page: Page;

  // Generator elements
  readonly flashcardGenerator: Locator;
  readonly generatorHeading: Locator;
  readonly sourceTextInput: Locator;
  readonly characterCounter: Locator;
  readonly generateButton: Locator;
  readonly textLengthError: Locator;
  readonly generationProgress: Locator;

  // Reviewer elements
  readonly flashcardReviewer: Locator;
  readonly reviewerHeading: Locator;
  readonly acceptAllButton: Locator;
  readonly rejectAllButton: Locator;
  readonly candidatesList: Locator;
  readonly reviewCards: Locator;
  readonly reviewComplete: Locator;
  readonly generateMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Generator
    this.flashcardGenerator = page.getByTestId("flashcard-generator");
    this.generatorHeading = page.getByTestId("generator-heading");
    this.sourceTextInput = page.getByTestId("source-text-input");
    this.characterCounter = page.getByTestId("character-counter");
    this.generateButton = page.getByTestId("generate-button");
    this.textLengthError = page.getByTestId("text-length-error");
    this.generationProgress = page.getByTestId("generation-progress");

    // Reviewer
    this.flashcardReviewer = page.getByTestId("flashcard-reviewer");
    this.reviewerHeading = page.getByTestId("reviewer-heading");
    this.acceptAllButton = page.getByTestId("accept-all-button");
    this.rejectAllButton = page.getByTestId("reject-all-button");
    this.candidatesList = page.getByTestId("candidates-list");
    this.reviewCards = page.getByTestId("review-card");
    this.reviewComplete = page.getByTestId("review-complete");
    this.generateMoreButton = page.getByTestId("generate-more-button");
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto("/dashboard");
  }

  /**
   * Assert that the dashboard page is loaded with generator visible
   */
  async assertLoaded() {
    await expect(this.flashcardGenerator).toBeVisible();
    await expect(this.generatorHeading).toHaveText("Generator Fiszki");
  }

  /**
   * Fill in the source text for flashcard generation
   */
  async fillSourceText(text: string) {
    await this.sourceTextInput.fill(text);
  }

  /**
   * Click the generate button
   */
  async clickGenerate() {
    await this.generateButton.click();
  }

  /**
   * Generate flashcards from source text
   */
  async generateFlashcards(text: string) {
    await this.fillSourceText(text);
    await this.clickGenerate();
  }

  /**
   * Assert that the reviewer is displayed with candidates
   */
  async assertReviewerVisible() {
    await expect(this.flashcardReviewer).toBeVisible();
    await expect(this.reviewerHeading).toHaveText("Przegląd propozycji fiszek");
  }

  /**
   * Assert that text length error is displayed
   */
  async assertTextLengthErrorVisible() {
    await expect(this.textLengthError).toBeVisible();
  }

  /**
   * Assert that generation is in progress
   */
  async assertGenerationInProgress() {
    await expect(this.generationProgress).toBeVisible();
  }

  /**
   * Get the number of review cards displayed
   */
  async getReviewCardsCount(): Promise<number> {
    return await this.reviewCards.count();
  }

  /**
   * Accept the first flashcard candidate
   */
  async acceptFirstCard() {
    const firstCard = this.reviewCards.first();
    const acceptButton = firstCard.getByTestId("accept-card-button");
    await acceptButton.click();
  }

  /**
   * Reject the first flashcard candidate
   */
  async rejectFirstCard() {
    const firstCard = this.reviewCards.first();
    const rejectButton = firstCard.getByTestId("reject-card-button");
    await rejectButton.click();
  }

  /**
   * Edit the first flashcard candidate
   */
  async editFirstCard() {
    const firstCard = this.reviewCards.first();
    const editButton = firstCard.getByTestId("edit-card-button");
    await editButton.click();
  }

  /**
   * Accept all flashcard candidates
   */
  async acceptAllCards() {
    await this.acceptAllButton.click();
  }

  /**
   * Reject all flashcard candidates
   */
  async rejectAllCards() {
    await this.rejectAllButton.click();
  }

  /**
   * Assert that review is complete
   */
  async assertReviewComplete() {
    await expect(this.reviewComplete).toBeVisible();
  }

  /**
   * Click generate more button after completing review
   */
  async clickGenerateMore() {
    await this.generateMoreButton.click();
  }

  /**
   * Get the content of a specific review card
   */
  async getCardContent(index = 0): Promise<{ front: string; back: string }> {
    const card = this.reviewCards.nth(index);
    const front = await card.getByTestId("card-front").textContent();
    const back = await card.getByTestId("card-back").textContent();
    return {
      front: front || "",
      back: back || "",
    };
  }
}
