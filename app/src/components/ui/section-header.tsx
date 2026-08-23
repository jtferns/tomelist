import * as React from "react"

import { cn } from "@/lib/utils"
import { Diamond } from "@/components/ui/diamond"

function SectionHeader({
  title,
  children,
  className,
}: {
  title: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="section-header" className={cn("flex items-center gap-3", className)}>
      <Diamond />
      <h2 className="font-display font-semibold text-[19px] tracking-[.08em] uppercase m-0">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/50 to-transparent" />
      {children}
    </div>
  )
}

function SectionKicker({
  children,
  className,
  as: Tag = "span",
}: {
  children?: React.ReactNode
  className?: string
  as?: "h2" | "span"
}) {
  return (
    <Tag
      data-slot="section-kicker"
      className={cn("text-xs uppercase tracking-[.12em] text-gold-soft font-bold", className)}
    >
      {children}
    </Tag>
  )
}

export { SectionHeader, SectionKicker }
