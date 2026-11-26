import type { Page } from "@playwright/test";

export const SECOND_HUNT = "2026-12-astronomy-second-hunt";
export const FIRST_HUNT = "2026-09-astronomy-first-hunt";

// Week 2 of the Second Hunt, so week-based UI does not drift with the real date.
const EVENT_WEEK_2 = new Date("2026-12-08T12:00:00Z");

// Fixes the clock (time still flows), opens a path, and waits out the service worker's
// first-visit takeover, which reloads the page once.
export async function openApp(page: Page, path: string, time: Date = EVENT_WEEK_2) {
  await page.clock.install({ time });
  await page.goto(path);
  await page
    .evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          if (!("serviceWorker" in navigator)) return resolve(true);
          if (navigator.serviceWorker.controller) return resolve(true);
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(true));
          setTimeout(() => resolve(false), 5000);
        }),
    )
    .catch(() => true);
  await page.waitForLoadState("load");
}

export function nav(page: Page) {
  return page.getByRole("navigation").filter({ visible: true });
}

export async function goTo(page: Page, tab: "Overview" | "Objectives" | "Planner" | "Exchanges" | "Settings") {
  await nav(page).getByRole("link", { name: tab, exact: true }).click();
}
