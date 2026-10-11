import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncStatus } from "@/lib/useSync";
import { useAppStore } from "@/store/useAppStore";
import { SyncSettings } from "./SyncSettings";

vi.mock("./SyncQr", () => ({ SyncQr: ({ url }: { url: string }) => <div data-testid="qr">{url}</div> }));

const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ syncToken: undefined });
  useSyncStatus.setState({ status: "off" });
});

describe("SyncSettings", () => {
  it("turns sync on", async () => {
    render(<SyncSettings />);
    expect(screen.queryByTestId("qr")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /turn on sync/i }));
    const token = useAppStore.getState().syncToken;
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(screen.getByTestId("qr")).toHaveTextContent(`${location.origin}/#sync=${token}`);
  });

  it("shows the connection status", () => {
    useAppStore.setState({ syncToken: TOKEN });
    render(<SyncSettings />);
    act(() => useSyncStatus.setState({ status: "connecting" }));
    expect(screen.getByTestId("sync-status")).toHaveTextContent(/connecting/i);
    act(() => useSyncStatus.setState({ status: "connected" }));
    expect(screen.getByTestId("sync-status")).toHaveTextContent(/synced/i);
    act(() => useSyncStatus.setState({ status: "offline" }));
    expect(screen.getByTestId("sync-status")).toHaveTextContent(/offline/i);
  });

  it("copies the pairing link", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ syncToken: TOKEN });
    render(<SyncSettings />);
    await user.click(screen.getByRole("button", { name: /copy link/i }));
    expect(await navigator.clipboard.readText()).toBe(`${location.origin}/#sync=${TOKEN}`);
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("asks before making a new link", async () => {
    useAppStore.setState({ syncToken: TOKEN });
    render(<SyncSettings />);
    await userEvent.click(screen.getByRole("button", { name: /new link/i }));
    expect(useAppStore.getState().syncToken).toBe(TOKEN);
    await userEvent.click(screen.getByRole("button", { name: /pair again/i }));
    expect(useAppStore.getState().syncToken).not.toBe(TOKEN);
    expect(useAppStore.getState().syncToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("asks before stopping sync, and keeps progress", async () => {
    useAppStore.setState({ syncToken: TOKEN });
    useAppStore.getState().addTomestones("e", 5);
    render(<SyncSettings />);
    await userEvent.click(screen.getByRole("button", { name: /stop syncing/i }));
    expect(useAppStore.getState().syncToken).toBe(TOKEN);
    await userEvent.click(screen.getByRole("button", { name: /tap again to stop/i }));
    expect(useAppStore.getState().syncToken).toBeUndefined();
    expect(useAppStore.getState().getProgress("e").tomestones).toBe(5);
    expect(screen.getByRole("button", { name: /turn on sync/i })).toBeInTheDocument();
  });
});
