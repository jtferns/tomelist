import { expect, test, type Page } from "@playwright/test";
import { SECOND_HUNT, addTomes, expectHud, goTo, openApp, reloadApp } from "./helpers";

async function seedWallet(page: Page, tomes: number) {
  await openApp(page, `/${SECOND_HUNT}/overview`);
  await addTomes(page, tomes);
  await expectHud(page, tomes);
  await goTo(page, "Exchanges");
}

test("Want, tier and quantity set the wishlist total", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/exchanges`);
  const row = page.getByTestId("exchange-dodo-horn");
  await row.getByRole("button", { name: "Want Dodo Horn" }).click();
  await expect(page.getByTestId("wanted-total")).toHaveText("100");

  const tier = row.getByTestId("tier-dodo-horn");
  await expect(tier).toHaveText("Nice");
  await tier.click();
  await expect(tier).toHaveText("Maybe");
  await tier.click();
  await expect(tier).toHaveText("Must");

  await row.getByRole("button", { name: "More Dodo Horn" }).click();
  await expect(row.getByTestId("qty-dodo-horn")).toHaveText("2");
  await expect(page.getByTestId("wanted-total")).toHaveText("200");
  await expect(row.getByTestId("short-dodo-horn")).toHaveText("200 short");
  await expect(row.getByRole("button", { name: "Log exchange" })).toBeDisabled();
});

test("logging an exchange spends tomes and marks the item exchanged after a reload", async ({ page }) => {
  await seedWallet(page, 120);
  const row = page.getByTestId("exchange-dodo-horn");
  await row.getByRole("button", { name: "Want Dodo Horn" }).click();
  await row.getByRole("button", { name: "Log exchange" }).click();
  await expectHud(page, 20);
  await expect(page.getByTestId("undo-toast")).toContainText("Exchanged Dodo Horn, −100 tomes");
  await expect(row).toContainText("Exchanged");

  await reloadApp(page);
  await expect(page.getByTestId("exchange-dodo-horn")).toContainText("Exchanged");
  await expectHud(page, 20);
});

test("buying a Uolon Horn Token spends 30 tomes and adds the token", async ({ page }) => {
  await seedWallet(page, 30);
  const row = page.getByTestId("exchange-uolon-horn-token");
  await row.getByRole("button", { name: "Want Uolon Horn Token" }).click();
  await row.getByRole("button", { name: "Log exchange" }).click();
  await expectHud(page, 0);
  await expect(page.getByTestId("hud-tokens")).toHaveAttribute("aria-label", "1 Uolon Horn Token");
  await expect(page.getByTestId("undo-toast")).toContainText("−30 tomes, +1 token");
});

test("the Uolon Horn needs tokens as well as tomes", async ({ page }) => {
  await seedWallet(page, 100);
  const row = page.getByTestId("exchange-uolon-horn");
  await row.getByRole("button", { name: "Want Uolon Horn" }).click();
  await expect(row.getByTestId("short-uolon-horn")).toHaveText("10 tokens short");
  await expect(row.getByRole("button", { name: "Log exchange" })).toBeDisabled();
});

test("a friend can cover a tradeable item, which is then received without spending tomes", async ({ page }) => {
  await seedWallet(page, 100);
  const row = page.getByTestId("exchange-dodo-horn");
  await row.getByRole("button", { name: "Want Dodo Horn" }).click();
  await row.getByRole("button", { name: "Friend's covering this" }).click();
  await expect(row.getByTestId("covering-dodo-horn")).toBeVisible();
  await row.getByRole("button", { name: "Received" }).click();
  await expect(row).toContainText("Exchanged");
  await expectHud(page, 100);
});

test("search and the type chips narrow the list", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/exchanges`);
  await page.getByRole("searchbox", { name: "Search items" }).fill("dodo");
  await expect(page.getByTestId("exchange-dodo-horn")).toBeVisible();
  await expect(page.getByTestId("exchange-drippy")).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search items" }).fill("");
  await page.getByTestId("type-filter").getByRole("button", { name: "Minion", exact: true }).click();
  await expect(page.getByTestId("exchange-drippy")).toBeVisible();
  await expect(page.getByTestId("exchange-dodo-horn")).toHaveCount(0);
});
