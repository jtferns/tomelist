import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Diamond } from "@/components/ui/diamond"

describe("Diamond", () => {
  it("is aria-hidden", () => {
    const { container } = render(<Diamond />)
    const el = container.querySelector('[data-slot="diamond"]')
    expect(el).toHaveAttribute("aria-hidden", "true")
  })
})
