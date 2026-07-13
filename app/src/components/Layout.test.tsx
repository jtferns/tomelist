import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";

describe("Layout", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      settings: { theme: { palette: "adder", mode: "light", ornament: "minimal", density: "compact" } },
    });
  });

  it("applies theme, palette, ornament, and density to documentElement", async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);
    await screen.findByTestId("overview-page");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.palette).toBe("adder");
    expect(document.documentElement.dataset.ornament).toBe("minimal");
    expect(document.documentElement.dataset.density).toBe("compact");
  });
});
