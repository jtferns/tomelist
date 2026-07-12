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

  it("shows a tier chip defaulting to Want that cycles want -> maybe -> must", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const chip = screen.getByTestId("tier-fat-cat-parasol");
    expect(chip).toHaveTextContent("Want");
    expect(useAppStore.getState().events[E]?.wishlist["fat-cat-parasol"]?.tier).toBe("want");

    await userEvent.click(chip);
    expect(chip).toHaveTextContent("Maybe");
    expect(useAppStore.getState().events[E]?.wishlist["fat-cat-parasol"]?.tier).toBe("maybe");

    await userEvent.click(chip);
    expect(chip).toHaveTextContent("Must");
    expect(useAppStore.getState().events[E]?.wishlist["fat-cat-parasol"]?.tier).toBe("must");
  });

  it("does not show an alt-source badge (no exchange in this event's data has altSources)", async () => {
    await renderExchanges();
    expect(screen.queryByTestId("alt-fat-cat-parasol")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alt-miners-earring")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alt-magicked-prism-bundle")).not.toBeInTheDocument();
  });

  it("does not render eorzeadb links or load the tooltip script (no exchange in this event's data has eorzeadbUrl)", async () => {
    await renderExchanges();
    expect(screen.queryByTestId("eorzeadb-fat-cat-parasol")).not.toBeInTheDocument();
    expect(
      document.querySelector('script[src="https://lds-img.finalfantasyxiv.com/pc/global/js/eorzeadb/loader.js?v3"]')
    ).not.toBeInTheDocument();
  });
});
