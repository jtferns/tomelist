import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { JoinSyncBanner, resolvePairingLink } from "./JoinSyncBanner";

const E = "2026-03-mogmog-collection";
const TOKEN = "BBBBBBBBBBBBBBBBBBBBBB";

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ events: {}, syncToken: undefined });
});

describe("resolvePairingLink", () => {
  it("does nothing without a token", () => {
    expect(resolvePairingLink(null)).toBeNull();
    expect(useAppStore.getState().syncToken).toBeUndefined();
  });

  it("joins at once on a device with no progress", () => {
    expect(resolvePairingLink(TOKEN)).toBeNull();
    expect(useAppStore.getState().syncToken).toBe(TOKEN);
  });

  it("returns the token to ask about when the device has progress", () => {
    useAppStore.getState().addTomestones(E, 5);
    expect(resolvePairingLink(TOKEN)).toBe(TOKEN);
    expect(useAppStore.getState().syncToken).toBeUndefined();
  });

  it("ignores the group this device is already in", () => {
    useAppStore.getState().addTomestones(E, 5);
    useAppStore.getState().setSyncToken(TOKEN);
    expect(resolvePairingLink(TOKEN)).toBeNull();
  });
});

describe("JoinSyncBanner", () => {
  it("renders nothing without a pending token", () => {
    render(<JoinSyncBanner token={null} />);
    expect(screen.queryByTestId("join-sync")).toBeNull();
  });

  it("joins on Join", async () => {
    useAppStore.getState().addTomestones(E, 5);
    render(<JoinSyncBanner token={TOKEN} />);
    expect(screen.getByTestId("join-sync")).toHaveTextContent(/replaced/i);
    await userEvent.click(screen.getByRole("button", { name: /^join$/i }));
    expect(useAppStore.getState().syncToken).toBe(TOKEN);
    expect(screen.queryByTestId("join-sync")).toBeNull();
  });

  it("leaves progress alone on Not now", async () => {
    useAppStore.getState().addTomestones(E, 5);
    render(<JoinSyncBanner token={TOKEN} />);
    await userEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(useAppStore.getState().syncToken).toBeUndefined();
    expect(useAppStore.getState().getProgress(E).tomestones).toBe(5);
    expect(screen.queryByTestId("join-sync")).toBeNull();
  });
});
