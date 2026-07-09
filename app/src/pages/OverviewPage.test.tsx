import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderOverview() {
  const router = createAppRouter();
  render(<RouterProvider router={router} />);
  await router.navigate({ to: "/$eventId/overview", params: { eventId: E } });
  await screen.findByTestId("overview-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("OverviewPage", () => {
  it("shows the wallet and event name", async () => {
    await renderOverview();
    expect(screen.getByText(/Mogmog Collection/)).toBeInTheDocument();
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("0");
  });
  it("steppers adjust the wallet", async () => {
    await renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "+10" }));
    await userEvent.click(screen.getByRole("button", { name: "+1" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("11");
    await userEvent.click(screen.getByRole("button", { name: "-1" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("10");
  });
});
