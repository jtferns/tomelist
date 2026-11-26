import { expect, test } from "@playwright/test";
import { FIRST_HUNT, SECOND_HUNT, goTo, nav, openApp } from "./helpers";

test("the root opens the newest event's Overview", async ({ page }) => {
  await openApp(page, "/");
  await expect(page).toHaveURL(new RegExp(`/${SECOND_HUNT}/overview$`));
  await expect(page.getByTestId("overview-page")).toBeVisible();
});

test("the tab bar opens every page of the event", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/overview`);
  for (const [tab, testId] of [
    ["Objectives", "objectives-page"],
    ["Planner", "planner-page"],
    ["Exchanges", "exchanges-page"],
    ["Settings", "settings-page"],
    ["Overview", "overview-page"],
  ] as const) {
    await goTo(page, tab);
    await expect(page.getByTestId(testId)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${SECOND_HUNT}/${tab.toLowerCase()}$`));
  }
  await expect(nav(page).getByRole("link", { name: "Overview", exact: true })).toHaveClass(/active/);
});

test("the event switcher keeps the current tab and marks ended events", async ({ page }) => {
  await openApp(page, `/${SECOND_HUNT}/exchanges`);
  await page.getByTestId("event-switcher-trigger").click();
  const list = page.getByRole("listbox", { name: "Switch event" });
  const firstHunt = list.getByRole("option", { name: /First Hunt/ });
  await expect(firstHunt).toContainText("Ended");
  await firstHunt.click();
  await expect(page).toHaveURL(new RegExp(`/${FIRST_HUNT}/exchanges$`));
  await expect(page.getByTestId("exchange-uolon-horn")).toBeVisible();
});

test("an unknown event id shows a not-found message", async ({ page }) => {
  await openApp(page, "/2026-01-no-such-event/overview");
  await expect(page.getByText("This event isn't in Tomelist.")).toBeVisible();
});
