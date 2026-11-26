import { expect, test } from "@playwright/test";
import { SECOND_HUNT, expectHud, openApp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/planner`);
});

test("the Planner suggests this week's Minimog and clears it", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Minimog · Week 2 of 6" })).toBeVisible();
  const pick = page.getByTestId("pick-obj-minimog-w2");
  await pick.getByRole("button", { name: "Log clear" }).click();
  await expectHud(page, 10);
  await expect(page.getByTestId("pick-obj-minimog-w2")).toHaveCount(0);
  await expect(page.getByText("This week's Minimog is done. The next one opens at the weekly reset.")).toBeVisible();
});

test("a logged weekly objective shows as claimed", async ({ page }) => {
  const weekly = page.getByTestId("weekly-obj-weekly");
  await weekly.getByRole("button", { name: "Log clear" }).click();
  await expectHud(page, 20);
  await expect(weekly.getByText("Claimed")).toBeVisible();
});

test("with no goal the pace line says there is no weekly target", async ({ page }) => {
  await expect(page.getByTestId("pace-line")).toHaveText("No weekly target yet. Earned 0 this week.");
});
