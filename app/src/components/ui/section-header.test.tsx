import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SectionHeader } from "@/components/ui/section-header"

describe("SectionHeader", () => {
  it("renders title in an h2 and right-slot children", () => {
    render(
      <SectionHeader title="Objectives">
        <span>3/10</span>
      </SectionHeader>
    )
    expect(screen.getByRole("heading", { level: 2, name: "Objectives" })).toBeInTheDocument()
    expect(screen.getByText("3/10")).toBeInTheDocument()
  })
})
