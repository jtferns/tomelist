import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyEventProgress } from "@tomelist/schema";
import { beforeEach, describe, expect, it } from "vitest";
import { WalletStepper } from "@/components/WalletStepper";
import { useAppStore } from "@/store/useAppStore";

const E = "2026-03-mogmog-collection";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("WalletStepper", () => {
  it("exposes an explicit aria-label on every button", () => {
    render(<WalletStepper eventId={E} />);
    expect(screen.getByRole("button", { name: "Subtract 10 tomestones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subtract 1 tomestone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 1 tomestone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 10 tomestones" })).toBeInTheDocument();
  });

  it("keeps the count floored at 0 when subtracting past zero", async () => {
    useAppStore.setState({ events: { [E]: emptyEventProgress() } });
    render(<WalletStepper eventId={E} />);
    await userEvent.click(screen.getByRole("button", { name: "Subtract 10 tomestones" }));
    expect(screen.getByTestId("wallet-count")).toHaveTextContent("0");
  });
});
