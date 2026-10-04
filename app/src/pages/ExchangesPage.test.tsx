import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useUndoToast } from "@/components/UndoToast";
import { useAppStore } from "@/store/useAppStore";
import { createAppRouter } from "@/router";
import { ExchangeRow } from "@/pages/ExchangesPage";
import type { Exchange } from "@tomelist/schema";

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
  useUndoToast.setState({ toast: null });
});

describe("ExchangesPage", () => {
  it("lists exchange items with costs", async () => {
    await renderExchanges();
    expect(screen.getByText("Fat Cat Parasol")).toBeInTheDocument();
    expect(screen.getByTestId("exchange-fat-cat-parasol")).toHaveTextContent("50");
  });

  it("tapping Want adds the item and updates the summary", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
  });

  it("labels the Want button and keeps wanted names at full strength", async () => {
    await renderExchanges();
    const want = screen.getByRole("button", { name: /want fat cat parasol/i });
    expect(want).toHaveTextContent("Want");
    expect(want).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(want);
    expect(want).toHaveTextContent("Wanted");
    expect(want).toHaveAttribute("aria-pressed", "true");
    const name = within(screen.getByTestId("exchange-fat-cat-parasol")).getByText("Fat Cat Parasol");
    expect(name.closest(".italic, .opacity-60")).toBeNull();
  });

  it("tapping Wanted again removes the item", async () => {
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
    // stepper clicks must not remove the item
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

  it("Exchanged deducts one unit and decrements quantity", async () => {
    useAppStore.getState().addTomestones(E, 120);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i })); // qty 2
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /^exchanged$/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(70);
    expect(screen.getByTestId("qty-fat-cat-parasol")).toHaveTextContent("1");
    await userEvent.click(within(row).getByRole("button", { name: /^exchanged$/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(20);
    expect(within(row).getByText(/exchanged/i)).toBeInTheDocument();
  });

  it("undo after exchanging puts the tomes and the wanted item back", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    await userEvent.click(within(row).getByRole("button", { name: /^exchanged$/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(10);
    await userEvent.click(within(screen.getByTestId("undo-toast")).getByRole("button", { name: /undo/i }));
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(60);
    expect(useAppStore.getState().events[E]?.wishlist["fat-cat-parasol"]?.status).toBe("wanted");
    expect(screen.queryByTestId("undo-toast")).not.toBeInTheDocument();
  });

  it("says 1 tome, not 1 tomes", () => {
    render(<ExchangeRow eventId={E} item={{ id: "one", name: "One", cost: 1, type: "Item" }} wallet={5} />);
    expect(screen.getByTestId("exchange-one")).toHaveTextContent("1 tome");
    expect(screen.getByTestId("exchange-one")).not.toHaveTextContent("1 tomes");
  });

  it("disables Exchanged when wallet can't cover one unit", async () => {
    useAppStore.getState().addTomestones(E, 20);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    expect(within(row).getByRole("button", { name: /^exchanged$/i })).toBeDisabled();
  });

  it("enables Exchanged once wallet covers one unit", async () => {
    useAppStore.getState().addTomestones(E, 60);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    expect(within(row).getByRole("button", { name: /^exchanged$/i })).toBeEnabled();
  });

  it("shows a tier chip defaulting to Nice that cycles want -> maybe -> must", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const chip = screen.getByTestId("tier-fat-cat-parasol");
    expect(chip).toHaveTextContent("Nice");
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

  it("sort-cost orders exchanges ascending by cost", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByTestId("sort-cost"));
    const ids = screen.getAllByTestId(/^exchange-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "exchange-magicked-prism-bundle",
      "exchange-fat-cat-parasol",
      "exchange-miners-earring",
    ]);
  });

  it("sort-tier puts a must-tier wanted item first and an exchanged item last", async () => {
    useAppStore.getState().addTomestones(E, 200);
    await renderExchanges();
    // Want fat-cat-parasol and bump its tier to Must.
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(screen.getByTestId("tier-fat-cat-parasol")); // want -> maybe
    await userEvent.click(screen.getByTestId("tier-fat-cat-parasol")); // maybe -> must
    // Want and exchange miners-earring so it lands in the "exchanged" bucket.
    await userEvent.click(screen.getByRole("button", { name: /want miner's earring/i }));
    const earringRow = screen.getByTestId("exchange-miners-earring");
    await userEvent.click(within(earringRow).getByRole("button", { name: /^exchanged$/i }));

    await userEvent.click(screen.getByTestId("sort-tier"));
    const ids = screen.getAllByTestId(/^exchange-/).map((el) => el.getAttribute("data-testid"));
    expect(ids[0]).toBe("exchange-fat-cat-parasol");
    expect(ids[ids.length - 1]).toBe("exchange-miners-earring");
  });

  it("sort-default restores event order", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByTestId("sort-cost"));
    await userEvent.click(screen.getByTestId("sort-default"));
    const ids = screen.getAllByTestId(/^exchange-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "exchange-miners-earring",
      "exchange-fat-cat-parasol",
      "exchange-magicked-prism-bundle",
    ]);
  });

  it("sort chips expose aria-pressed and flip pressed state on click", async () => {
    await renderExchanges();
    const costChip = screen.getByTestId("sort-cost");
    const defaultChip = screen.getByTestId("sort-default");
    expect(defaultChip).toHaveAttribute("aria-pressed", "true");
    expect(costChip).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(costChip);
    expect(costChip).toHaveAttribute("aria-pressed", "true");
    expect(defaultChip).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking the qty + button does not toggle the wishlist entry off (stopPropagation guard)", async () => {
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("50");
    await userEvent.click(screen.getByRole("button", { name: /more fat cat parasol/i }));
    // still wanted, not toggled off
    expect(screen.getByTestId("wanted-total")).toHaveTextContent("100");
    expect(screen.getByRole("button", { name: /want fat cat parasol/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("search narrows the list by name", async () => {
    await renderExchanges();
    await userEvent.type(screen.getByRole("searchbox", { name: /search items/i }), "parasol");
    const ids = screen.getAllByTestId(/^exchange-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["exchange-fat-cat-parasol"]);
  });

  it("the Wanted filter shows only wanted items, and an empty filter says so", async () => {
    await renderExchanges();
    const filter = screen.getByTestId("type-filter");
    await userEvent.click(within(filter).getByRole("button", { name: "Wanted" }));
    expect(screen.queryAllByTestId(/^exchange-/)).toHaveLength(0);
    expect(screen.getByText(/no items match/i)).toBeInTheDocument();
    await userEvent.click(within(filter).getByRole("button", { name: "All" }));
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    await userEvent.click(within(filter).getByRole("button", { name: "Wanted" }));
    const ids = screen.getAllByTestId(/^exchange-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["exchange-fat-cat-parasol"]);
  });

  describe("item icon", () => {
    const baseItem: Exchange = {
      id: "test-item",
      name: "Test Item",
      cost: 10,
      type: "Fashion",
    };

    it("renders no img when item.icon is absent", () => {
      render(<ExchangeRow eventId={E} item={baseItem} wallet={0} />);
      const row = screen.getByTestId("exchange-test-item");
      expect(within(row).queryByRole("img")).not.toBeInTheDocument();
    });

    it("shows a type glyph when item.icon is absent", () => {
      render(<ExchangeRow eventId={E} item={baseItem} wallet={0} />);
      expect(screen.getByTestId("glyph-test-item")).toBeInTheDocument();
    });

    it("renders an img with empty alt when item.icon is present", () => {
      render(
        <ExchangeRow eventId={E} item={{ ...baseItem, icon: "/icons/test-item.png" }} wallet={0} />
      );
      const row = screen.getByTestId("exchange-test-item");
      const img = within(row).getByRole("presentation", { hidden: true });
      expect(img).toHaveAttribute("src", "/icons/test-item.png");
      expect(img).toHaveAttribute("alt", "");
    });
  });

  it("shows how many tomes short the wallet is, and nothing once it can pay", () => {
    const item: Exchange = { id: "short-item", name: "Short Item", cost: 30, type: "Mount" };
    const { rerender } = render(<ExchangeRow eventId={E} item={item} wallet={12} />);
    expect(screen.getByTestId("short-short-item")).toHaveTextContent("18 short");
    rerender(<ExchangeRow eventId={E} item={item} wallet={30} />);
    expect(screen.queryByTestId("short-short-item")).not.toBeInTheDocument();
  });

  it("renders the tome cost once per row", () => {
    render(
      <ExchangeRow
        eventId={E}
        item={{ id: "cost-once", name: "Cost Once", cost: 10, type: "Fashion" }}
        wallet={0}
      />
    );
    const row = screen.getByTestId("exchange-cost-once");
    expect(within(row).getAllByText(/tomes/i)).toHaveLength(1);
  });

  it("insufficient wanted item keeps data-insufficient and disables Exchanged", async () => {
    useAppStore.getState().addTomestones(E, 20);
    await renderExchanges();
    await userEvent.click(screen.getByRole("button", { name: /want fat cat parasol/i }));
    const row = screen.getByTestId("exchange-fat-cat-parasol");
    expect(row).toHaveAttribute("data-insufficient", "true");
    expect(within(row).getByRole("button", { name: /^exchanged$/i })).toBeDisabled();
  });
});
