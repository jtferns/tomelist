import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";

const E = "2026-03-mogmog-collection";

async function renderExchanges() {
  const router = createAppRouter();
  await router.navigate({ to: "/$eventId/exchanges", params: { eventId: E } });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("exchanges-page");
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ExchangesPage", () => {
  it("lists exchange items with costs", async () => {
    await renderExchanges();
    expect(screen.getByText("Fat Cat Parasol")).toBeInTheDocument();
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveTextContent("50");
  });
  it("tapping an item wants it and updates the summary", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
  });
  it("mark exchanged deducts wallet", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    expect(within(row).getByText(/exchanged/i)).toBeInTheDocument();
  });
});
