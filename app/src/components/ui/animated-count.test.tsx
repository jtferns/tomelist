import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedCount } from "./animated-count";

describe("AnimatedCount", () => {
  it("renders the value (final, since jsdom has no matchMedia)", () => {
    render(<AnimatedCount value={128} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent("128");
  });

  it("applies a format function", () => {
    render(<AnimatedCount value={1234} format={(n) => n.toLocaleString()} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent("1,234");
  });

  it("does not pop on first render", () => {
    render(<AnimatedCount value={5} data-testid="c" />);
    expect(screen.getByTestId("c").className).not.toContain("animate-value-pop");
  });

  it("pops after the value changes", () => {
    const { rerender } = render(<AnimatedCount value={5} data-testid="c" />);
    rerender(<AnimatedCount value={9} data-testid="c" />);
    const el = screen.getByTestId("c");
    expect(el).toHaveTextContent("9");
    expect(el.className).toContain("animate-value-pop");
  });
});
