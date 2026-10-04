import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

async function renderSettings() {
  const router = createAppRouter();
  await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("settings-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({
    settings: { theme: { palette: "maelstrom", mode: "dark", ornament: "full", density: "comfy" } },
  });
});

afterEach(() => {
  vi.doUnmock("@/lib/events");
  vi.resetModules();
});

describe("SettingsPage", () => {
  it("renders all four control groups", async () => {
    await renderSettings();
    expect(screen.getByRole("heading", { name: /grand company/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^mode$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ornament/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /density/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /events/i })).toBeInTheDocument();
  });

  it("renders Grand Company and Mode as chips, like Ornament and Density", async () => {
    await renderSettings();
    for (const name of [/^maelstrom$/i, /twin adder/i, /immortal flames/i, /^dark$/i, /^light$/i]) {
      expect(screen.getByRole("button", { name }).getAttribute("data-slot")).toBe("chip");
    }
  });

  it("switches mode independently of palette", async () => {
    await renderSettings();
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
    await renderSettings();
    await userEvent.click(screen.getByRole("button", { name: /immortal flames/i }));
    expect(useAppStore.getState().settings.theme.palette).toBe("flames");
    expect(document.documentElement.dataset.palette).toBe("flames");
  });

  it("aria-pressed reflects the active Grand Company and Mode buttons", async () => {
    await renderSettings();
    const maelstrom = screen.getByRole("button", { name: /^maelstrom$/i });
    const flames = screen.getByRole("button", { name: /immortal flames/i });
    expect(maelstrom).toHaveAttribute("aria-pressed", "true");
    expect(flames).toHaveAttribute("aria-pressed", "false");

    const dark = screen.getByRole("button", { name: /^dark$/i });
    const light = screen.getByRole("button", { name: /^light$/i });
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(flames);
    expect(flames).toHaveAttribute("aria-pressed", "true");
    expect(maelstrom).toHaveAttribute("aria-pressed", "false");
  });

  it("ornament chips wire to setOrnament and reflect active state", async () => {
    await renderSettings();
    const reduced = screen.getByRole("button", { name: /^reduced$/i });
    expect(reduced).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(reduced);
    expect(useAppStore.getState().settings.theme.ornament).toBe("reduced");
    expect(reduced).toHaveAttribute("aria-pressed", "true");
  });

  it("density chips wire to setDensity and reflect active state", async () => {
    await renderSettings();
    const compact = screen.getByRole("button", { name: /^compact$/i });
    expect(compact).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(compact);
    expect(useAppStore.getState().settings.theme.density).toBe("compact");
    expect(compact).toHaveAttribute("aria-pressed", "true");
  });

  it("switching palette, mode, ornament, and density sequentially does not reset earlier choices", async () => {
    await renderSettings();
    await userEvent.click(screen.getByRole("button", { name: /twin adder/i }));
    await userEvent.click(screen.getByRole("button", { name: /^light$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^minimal$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^compact$/i }));
    expect(useAppStore.getState().settings.theme).toEqual({
      palette: "adder",
      mode: "light",
      ornament: "minimal",
      density: "compact",
    });
  });

  it("lists events with a gold-outline Ended badge for ended events", async () => {
    vi.doMock("@/lib/events", async () => {
      const actual = await vi.importActual<typeof import("@/lib/events")>("@/lib/events");
      return { ...actual, isEventEnded: () => true };
    });
    vi.resetModules();
    const { createAppRouter: freshCreateAppRouter } = await import("@/router");
    const { RouterProvider: FreshRouterProvider } = await import("@tanstack/react-router");
    const router = freshCreateAppRouter();
    await router.navigate({ to: "/$eventId/settings", params: { eventId: "2026-03-mogmog-collection" } });
    render(<FreshRouterProvider router={router} />);
    await screen.findByTestId("settings-page");

    expect(screen.getByRole("link", { name: /Mogmog Collection/ })).toBeInTheDocument();
    const endedBadges = screen.getAllByText("Ended");
    expect(endedBadges.length).toBeGreaterThan(0);
    const badge = endedBadges.find((el) => el.className.includes("border-gold/30"));
    expect(badge).toBeDefined();
    expect(badge).toHaveClass("border-gold/30");
  });

  it("shows the version line", async () => {
    await renderSettings();
    expect(screen.getByText(/Tomelist v2\.0\.0-dev/)).toBeInTheDocument();
  });
  it("offers the city palettes and applies one", async () => {
    await renderSettings();
    await userEvent.click(screen.getByRole("button", { name: "The Crystarium" }));
    expect(useAppStore.getState().settings.theme.palette).toBe("crystarium");
    expect(document.documentElement.dataset.palette).toBe("crystarium");
  });

  it("discloses AI assistance and links the author's GitHub", async () => {
    await renderSettings();
    const note = screen.getByTestId("ai-disclosure");
    expect(note).toHaveTextContent("v2 was rebuilt with Claude, an AI coding assistant.");
    expect(within(note).getByRole("link", { name: "jtferns" })).toHaveAttribute("href", "https://github.com/jtferns");
  });
});
