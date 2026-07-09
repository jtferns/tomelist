import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./router";

describe("router", () => {
  it("root redirects to the active event overview", async () => {
    const router = createAppRouter();
    await router.navigate({ to: "/" });
    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId("overview-page")).toBeInTheDocument();
    expect(router.state.location.pathname).toContain("/2026-03-mogmog-collection/overview");
  });
  it("renders objectives route", async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);
    await router.navigate({ to: "/$eventId/objectives", params: { eventId: "2026-03-mogmog-collection" } });
    expect(await screen.findByTestId("objectives-page")).toBeInTheDocument();
  });
});
