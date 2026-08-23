import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "whitespace-nowrap rounded-full px-3.5 py-[5px] text-[13px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground font-bold border border-primary/50",
        false:
          "bg-surface-1 text-muted-foreground font-medium border border-border hover:border-gold/40 hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

function Chip({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof chipVariants>) {
  return (
    <button
      data-slot="chip"
      data-active={active}
      aria-pressed={active ?? false}
      className={cn(chipVariants({ active }), className)}
      {...props}
    />
  )
}

export { Chip, chipVariants }
