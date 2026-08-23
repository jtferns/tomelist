import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FramedCard } from "@/components/ui/framed-card"

describe("FramedCard", () => {
  it("renders corner ornaments when corners is true", () => {
    const { container } = render(<FramedCard corners>content</FramedCard>)
    expect(container.querySelectorAll('[data-slot="frame-corner"]')).toHaveLength(2)
  })

  it("does not render corner ornaments by default", () => {
    const { container } = render(<FramedCard>content</FramedCard>)
    expect(container.querySelectorAll('[data-slot="frame-corner"]')).toHaveLength(0)
  })

  it("switches to muted styling", () => {
    const { container } = render(<FramedCard muted>content</FramedCard>)
    const el = container.querySelector('[data-slot="framed-card"]')
    expect(el).toHaveClass("bg-surface-1")
    expect(el).not.toHaveClass("bg-surface-2")
  })

  it("uses frame styling by default (not muted)", () => {
    const { container } = render(<FramedCard>content</FramedCard>)
    const el = container.querySelector('[data-slot="framed-card"]')
    expect(el).toHaveClass("bg-surface-2")
    expect(el).not.toHaveClass("bg-surface-1")
  })
})
