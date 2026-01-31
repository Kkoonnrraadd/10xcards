import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";

test.describe("Home", () => {
  test("loads home page", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.assertLoaded();
    await expect(page).toHaveScreenshot("home.png", { maxDiffPixelRatio: 0.02 });
  });
});
