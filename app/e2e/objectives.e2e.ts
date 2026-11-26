import { expect, test } from "@playwright/test";
import { SECOND_HUNT, expectHud, openApp, reloadApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/objectives`);
});

test("logging a clear pays its tomes, and the toast's Undo takes them back", async ({ page }) => {
  const gates = page.getByTestId("objective-obj-gates");
  await gates.getByRole("button", { name: "Log clear" }).click();
  await expect(gates.getByTestId("objective-count")).toHaveText("1");
  await expectHud(page, 10);

  const toast = page.getByTestId("undo-toast");
  await expect(toast).toContainText("+10 tomes");
  await toast.getByRole("button", { name: /undo/i }).click();
  await expect(gates.getByTestId("objective-count")).toHaveText("0");
  await expectHud(page, 0);
});

test("the row's undo button reverses the latest clear, and clears survive a reload", async ({ page }) => {
  const gates = page.getByTestId("objective-obj-gates");
  await gates.getByRole("button", { name: "Log clear" }).click();
  await gates.getByRole("button", { name: "Log clear" }).click();
  await expectHud(page, 20);
  await gates.getByRole("button", { name: /^Undo / }).click();
  await expect(gates.getByTestId("objective-count")).toHaveText("1");
  await expectHud(page, 10);

  await reloadApp(page);
  await expect(page.getByTestId("objective-obj-gates").getByTestId("objective-count")).toHaveText("1");
  await expectHud(page, 10);
});

test("a multi-clear ultimog pays tomes and tokens only on the last clear", async ({ page }) => {
  const ultimog = page.getByTestId("objective-obj-ultimog-treasure");
  await expect(ultimog.getByTestId("objective-clears")).toHaveText("/5");
  for (let i = 1; i <= 4; i++) {
    await ultimog.getByRole("button", { name: "Log clear" }).click();
    await expect(ultimog.getByTestId("objective-count")).toHaveText(String(i));
  }
  await expectHud(page, 0);

  await ultimog.getByRole("button", { name: "Log clear" }).click();
  await expectHud(page, 70);
  await expect(page.getByTestId("hud-tokens")).toHaveAttribute("aria-label", "5 Uolon Horn Tokens");
  await expect(ultimog.getByRole("button", { name: "Cleared" })).toBeDisabled();
});

test("a category chip narrows the list to that category", async ({ page }) => {
  await page.getByTestId("filter-GATEs").click();
  await expect(page.getByTestId("objective-obj-gates")).toBeVisible();
  await expect(page.getByTestId("objective-obj-dungeons")).toHaveCount(0);
  await page.getByTestId("filter-all").click();
  await expect(page.getByTestId("objective-obj-dungeons")).toBeVisible();
});

test("Pick one for me names a moogle-marked duty", async ({ page }) => {
  const dungeons = page.getByTestId("objective-obj-dungeons");
  await dungeons.getByTestId("pick-duty").click();
  await expect(dungeons.getByTestId("picked-duty")).not.toBeEmpty();
  await expect(dungeons.getByTestId("pick-duty")).toHaveText("Pick another");
});
