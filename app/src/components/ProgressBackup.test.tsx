import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgressBackup } from "@/components/ProgressBackup";
import { useAppStore } from "@/store/useAppStore";

const E = "2026-03-mogmog-collection";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {} });
});

describe("ProgressBackup", () => {
  it("imports a valid backup and replaces progress", async () => {
    render(<ProgressBackup eventId={E} />);
    const backup = {
      schemaVersion: 2,
      settings: { theme: { palette: "adder", mode: "light", ornament: "full", density: "comfy" } },
      events: { [E]: { tomestones: 42, completedObjectives: {}, minimogPicks: [], wishlist: {} } },
      updatedAt: "2026-10-04T00:00:00Z",
    };
    const file = new File([JSON.stringify(backup)], "backup.json", { type: "application/json" });
    await userEvent.upload(screen.getByLabelText("Import progress file"), file);
    expect(await screen.findByText("Progress imported.")).toBeInTheDocument();
    expect(useAppStore.getState().events[E]?.tomestones).toBe(42);
    expect(useAppStore.getState().settings.theme.palette).toBe("adder");
  });

  it("rejects a file that isn't a backup and changes nothing", async () => {
    useAppStore.getState().addTomestones(E, 5);
    render(<ProgressBackup eventId={E} />);
    const file = new File(['{"hello":1}'], "nope.json", { type: "application/json" });
    await userEvent.upload(screen.getByLabelText("Import progress file"), file);
    expect(await screen.findByText(/isn't a Tomelist backup/)).toBeInTheDocument();
    expect(useAppStore.getState().events[E]?.tomestones).toBe(5);
  });

  it("resets the event only on the second tap", async () => {
    useAppStore.getState().addTomestones(E, 5);
    render(<ProgressBackup eventId={E} />);
    await userEvent.click(screen.getByRole("button", { name: "Reset this event" }));
    expect(useAppStore.getState().events[E]?.tomestones).toBe(5);
    await userEvent.click(screen.getByRole("button", { name: "Tap again to reset" }));
    expect(useAppStore.getState().events[E]).toBeUndefined();
  });
});
