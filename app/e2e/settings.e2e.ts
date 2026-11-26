import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { SECOND_HUNT, addTomes, expectHud, goTo, openApp, reloadApp } from "./helpers";

test("palette and mode apply to the page and survive a reload", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/settings`);
  await page.getByRole("button", { name: "Ishgard", exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-palette", "ishgard");
  await expect(html).toHaveAttribute("data-theme", "light");

  await reloadApp(page);
  await expect(html).toHaveAttribute("data-palette", "ishgard");
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("reset needs a second tap and clears the event's progress", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/overview`);
  await addTomes(page, 15);
  await goTo(page, "Settings");
  await page.getByRole("button", { name: "Reset this event" }).click();
  await expectHud(page, 15);
  await page.getByRole("button", { name: "Tap again to reset" }).click();
  await expectHud(page, 0);
});

test("an exported backup restores progress after a reset", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/overview`);
  await addTomes(page, 42);
  await goTo(page, "Settings");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const file = await download.path();
  expect(await readFile(file, "utf8")).toMatch(/"tomestones":\s*42\b/);

  await page.getByRole("button", { name: "Reset this event" }).click();
  await page.getByRole("button", { name: "Tap again to reset" }).click();
  await expectHud(page, 0);

  await page.getByLabel("Import progress file").setInputFiles(file);
  await expectHud(page, 42);
  await reloadApp(page);
  await expectHud(page, 42);
});
