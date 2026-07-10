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

  it("tapping the card wants it and updates the summary", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
  });

  it("tapping a wanted card untoggles it", async () => {
    await renderExchanges();
    const card = () => screen.getByRole("button", { name: /want fat cat parasol/i });
    await userEvent.click(card());
    await userEvent.click(card());
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("0");
  });

  it("quantity stepper multiplies the total and clamps at 1", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i }));
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("2");
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("100");
    await userEvent.click(screen.getByRole("button", { name: /fewer fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /fewer fat cat parasol/i }));
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
    // stepper clicks must not toggle the card off
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
  });

  it("marks unaffordable wanted items", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("exchange-fat-cat-parasol")).not.toHaveAttribute("data-insufficient");
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i })); // 100 > 60
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveAttribute("data-insufficient", "true");
  });

  it("mark exchanged deducts one unit and decrements quantity", async () => {
    useAppStore.getState().addTomestones(E, 120);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i })); // qty 2
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(70);
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
    await userEvent.click(within(row).getByRole("button", { name: /mark exchanged/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(20);
    expect(within(row).getByText(/exchanged/i)).toBeInTheDocument();
  });

  it("disables mark exchanged when wallet can't cover one unit", async () => {
    useAppStore.getState().addTomestones(E, 20);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    expect(within(row).getByRole("button", { name: /mark exchanged/i })).toBeDisabled();
  });

  it("enables mark exchanged once wallet covers one unit", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    expect(within(row).getByRole("button", { name: /mark exchanged/i })).toBeEnabled();
  });
});
