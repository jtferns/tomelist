import { expect, test } from "@playwright/test";
import { SECOND_HUNT, addTomes, expectHud, openApp, reloadApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/overview`);
});

test("starting at 0 ticks off the first getting-started step", async ({ page }) => {
  const firstRun = page.getByTestId("first-run");
  const firstStep = firstRun.getByRole("listitem").first();
  await expect(firstStep).toHaveAttribute("data-done", "false");
  await firstRun.getByRole("button", { name: "start at 0" }).click();
  await expect(firstStep).toHaveAttribute("data-done", "true");
});

test("the wallet stepper sets the balance shown in the HUD, and it survives a reload", async ({ page }) => {
  await addTomes(page, 12);
  await page.getByRole("button", { name: "Subtract 1 tomestone" }).click();
  await expect(page.getByTestId("wallet-count")).toHaveText("11");
  await expectHud(page, 11);

  await reloadApp(page);
  await expect(page.getByTestId("wallet-count")).toHaveText("11");
  await expectHud(page, 11);
});

test("the token stepper sets the Uolon Horn Token balance in the HUD", async ({ page }) => {
  await page.getByRole("button", { name: "Add 1 Uolon Horn Token" }).click();
  await page.getByRole("button", { name: "Add 1 Uolon Horn Token" }).click();
  await expect(page.getByTestId("token-count")).toHaveText("2");
  await expect(page.getByTestId("hud-tokens")).toHaveAttribute("aria-label", "2 Uolon Horn Tokens");
});
