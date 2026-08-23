import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "@/components/ui/badge"

describe("Badge new variants", () => {
  it("tome variant applies rounded-[4px] and drops rounded-full", () => {
    render(<Badge variant="tome">Tome</Badge>)
    const el = screen.getByText("Tome")
    expect(el).toHaveClass("rounded-[4px]")
    expect(el).not.toHaveClass("rounded-full")
  })

  it("gold-outline variant applies rounded-[4px] and drops rounded-full", () => {
    render(<Badge variant="gold-outline">Gold</Badge>)
    const el = screen.getByText("Gold")
    expect(el).toHaveClass("rounded-[4px]")
    expect(el).not.toHaveClass("rounded-full")
  })

  it("default variant keeps rounded-full", () => {
    render(<Badge>Default</Badge>)
    const el = screen.getByText("Default")
    expect(el).toHaveClass("rounded-full")
  })
})
