import * as React from "react"

import { cn } from "@/lib/utils"

function FramedCard({
  corners = false,
  muted = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  corners?: boolean
  muted?: boolean
}) {
  return (
    <div
      data-slot="framed-card"
      className={cn(
        "rounded-lg border",
        muted
          ? "bg-surface-1 border-border shadow-none"
          : "border-[var(--frame-border)] shadow-[var(--frame-inset)] bg-surface-2",
        corners && "relative",
        className
      )}
      {...props}
    >
      {corners && (
        <>
          <span
            data-slot="frame-corner"
            aria-hidden="true"
            className="absolute top-0 left-0 w-[9px] h-[9px] border-t-2 border-l-2 border-gold/60"
          />
          <span
            data-slot="frame-corner"
            aria-hidden="true"
            className="absolute bottom-0 right-0 w-[9px] h-[9px] border-b-2 border-r-2 border-gold/60"
          />
        </>
      )}
      {children}
    </div>
  )
}

export { FramedCard }
