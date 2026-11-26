import { expect, test } from "@playwright/test";
import { SECOND_HUNT, addTomes, expectHud, openApp, reloadApp } from "./helpers";

test("once the service worker controls the page, the app loads and keeps progress offline", async ({
  page,
  context,
}) => {
  await openApp(page, `/${SECOND_HUNT}/overview`);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await addTomes(page, 7);

  await context.setOffline(true);
  await reloadApp(page);
  await expect(page.getByTestId("overview-page")).toBeVisible();
  await expectHud(page, 7);
});
