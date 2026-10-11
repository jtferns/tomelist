import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectError, fetchOwned } from "@/lib/collect";
import { useCollectStore } from "@/store/useCollectStore";
import { CharacterImport } from "./CharacterImport";

vi.mock("@/lib/collect", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/collect")>()),
  fetchOwned: vi.fn(),
}));

const imported = {
  characterId: "42",
  name: "Tome Lister",
  server: "Aegis",
  owned: ["mount:208"],
  fetchedAt: "2026-10-11T12:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  useCollectStore.setState({ imported: null });
});
afterEach(() => vi.mocked(fetchOwned).mockReset());

describe("CharacterImport", () => {
  it("imports from a Lodestone profile URL", async () => {
    vi.mocked(fetchOwned).mockResolvedValue(imported);
    render(<CharacterImport />);
    await userEvent.type(
      screen.getByLabelText(/lodestone/i),
      "https://na.finalfantasyxiv.com/lodestone/character/42/"
    );
    await userEvent.click(screen.getByRole("button", { name: /^import$/i }));
    expect(fetchOwned).toHaveBeenCalledWith("42", ["mount", "minion", "orchestrion", "barding", "hairstyle"]);
    expect(await screen.findByText(/tome lister \(aegis\)/i)).toBeInTheDocument();
    expect(useCollectStore.getState().imported).toEqual(imported);
  });

  it("rejects input that is not a character", async () => {
    render(<CharacterImport />);
    await userEvent.type(screen.getByLabelText(/lodestone/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /^import$/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/isn't a lodestone character/i);
    expect(fetchOwned).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", /look it up once on ffxivcollect\.com/i],
    ["private", /private on ffxiv collect/i],
    ["unavailable", /isn't responding/i],
  ] as const)("explains a %s failure without blocking", async (reason, text) => {
    vi.mocked(fetchOwned).mockRejectedValue(new CollectError(reason));
    render(<CharacterImport />);
    await userEvent.type(screen.getByLabelText(/lodestone/i), "42");
    await userEvent.click(screen.getByRole("button", { name: /^import$/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(screen.getByRole("button", { name: /^import$/i })).toBeEnabled();
  });

  it("refreshes and forgets an import", async () => {
    useCollectStore.setState({ imported });
    vi.mocked(fetchOwned).mockResolvedValue({ ...imported, owned: [] });
    render(<CharacterImport />);
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(fetchOwned).toHaveBeenCalledWith("42", expect.any(Array));
    expect(useCollectStore.getState().imported?.owned).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: /forget/i }));
    expect(useCollectStore.getState().imported).toBeNull();
    expect(screen.getByLabelText(/lodestone/i)).toBeInTheDocument();
  });
});
