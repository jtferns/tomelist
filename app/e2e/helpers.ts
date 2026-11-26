import { expect, type Page } from "@playwright/test";

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

// Reloads, retrying once when a service-worker reload interrupts the navigation.
export async function reloadApp(page: Page) {
  try {
    await page.reload();
  } catch (error) {
    if (!String(error).includes("interrupted")) throw error;
    await page.reload();
  }
  await page.waitForLoadState("load");
}

export function nav(page: Page) {
  return page.getByRole("navigation").filter({ visible: true });
}

export async function goTo(page: Page, tab: "Overview" | "Objectives" | "Planner" | "Exchanges" | "Settings") {
  await nav(page).getByRole("link", { name: tab, exact: true }).click();
}

export async function expectHud(page: Page, tomes: number) {
  await expect(page.getByTestId("hud-count")).toHaveText(String(tomes));
}

// Wallet stepper on Overview; adds in steps of 10 then 1.
export async function addTomes(page: Page, amount: number) {
  for (let i = 0; i < Math.floor(amount / 10); i++) {
    await page.getByRole("button", { name: "Add 10 tomestones" }).click();
  }
  for (let i = 0; i < amount % 10; i++) {
    await page.getByRole("button", { name: "Add 1 tomestone" }).click();
  }
}
