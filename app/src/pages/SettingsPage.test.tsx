import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({
    settings: { theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" } },
  });
});

describe("SettingsPage", () => {
  it("switches mode independently of palette", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("settings-page");
    await userEvent.click(screen.getByRole("button", { name: /^light$/i }));
    expect(useAppStore.getState().settings.theme).toEqual({
      palette: "maelstrom",
      mode: "light",
      ornament: "full",
      density: "comfy",
    });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.palette).toBe("maelstrom");
  });
  it("switches Grand Company palette", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("settings-page");
    await userEvent.click(screen.getByRole("button", { name: /immortal flames/i }));
    expect(useAppStore.getState().settings.theme.palette).toBe("flames");
    expect(document.documentElement.dataset.palette).toBe("flames");
  });
  it("lists events", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<RouterProvider router={router} />);
    await screen.findByTestId("settings-page");
    expect(screen.getByRole("link", { name: /Mogmog Collection/ })).toBeInTheDocument();
  });
});
