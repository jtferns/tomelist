import * as React from "react"

import { cn } from "@/lib/utils"

function ListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row"
      className={cn(
        "flex items-center gap-[var(--row-gap)] py-[var(--row-pad-y)] px-[var(--row-pad-x)] hover:bg-accent/50 transition-colors",
        className
      )}
      {...props}
    />
  )
}

function ListRowDivider({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row-divider"
      className={cn("h-px bg-border/60", className)}
      {...props}
    />
  )
}

export { ListRow, ListRowDivider }
