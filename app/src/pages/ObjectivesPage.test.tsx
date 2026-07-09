import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderObjectives() {
  const router = createAppRouter();
  render(<RouterProvider router={router} />);
  await router.navigate({ to: "/$eventId/objectives", params: { eventId: E } });
  await screen.findByTestId("objectives-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ObjectivesPage", () => {
  it("renders kind group headers", async () => {
    await renderObjectives();
    expect(screen.getByRole("heading", { name: /Standard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ultimog/i })).toBeInTheDocument();
  });
  it("did-it increments count and wallet", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-moogle-dungeons");
    await userEvent.click(within(row).getByRole("button", { name: /did it/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    expect(within(row).getByTestId("objective-count")).toHaveTextContent("1");
  });
  it("one-time objective disables after completion", async () => {
    await renderObjectives();
    const row = screen.getByTestId("objective-obj-ultimog-msq");
    await userEvent.click(within(row).getByRole("button", { name: /did it/i }));
    expect(within(row).getByRole("button", { name: /done/i })).toBeDisabled();
  });
});
