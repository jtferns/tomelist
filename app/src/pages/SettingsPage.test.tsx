import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ settings: { theme: "dark" } });
});

describe("SettingsPage", () => {
  it("switches theme", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("settings-page");
    await userEvent.click(screen.getByRole("button", { name: /light/i }));
    expect(useAppStore.getState().settings.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("lists events", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("settings-page");
    expect(screen.getByRole("link", { name: /Mogmog Collection/ })).toBeInTheDocument();
  });
});
