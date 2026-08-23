import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Chip } from "@/components/ui/chip"

describe("Chip", () => {
  it("reflects active=false via aria-pressed and inactive classes", () => {
    render(<Chip active={false}>Filter</Chip>)
    const chip = screen.getByRole("button", { name: "Filter" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    expect(chip).toHaveClass("bg-surface-1")
    expect(chip).not.toHaveClass("bg-accent")
  })

  it("reflects active=true via aria-pressed and active classes", () => {
    render(<Chip active>Filter</Chip>)
    const chip = screen.getByRole("button", { name: "Filter" })
    expect(chip).toHaveAttribute("aria-pressed", "true")
    expect(chip).toHaveClass("bg-accent")
    expect(chip).not.toHaveClass("bg-surface-1")
  })
})
