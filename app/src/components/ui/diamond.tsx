import * as React from "react"

function Diamond({
  size = 14,
  className,
}: {
  size?: number
  className?: string
}) {
  const outerSize = size - 2
  const innerSize = size / 2

  return (
    <div
      data-slot="diamond"
      aria-hidden="true"
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: outerSize,
          height: outerSize,
          transform: "rotate(45deg)",
          border: "1px solid color-mix(in oklch, var(--gold) 55%, transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: innerSize,
          height: innerSize,
          transform: "rotate(45deg)",
          background: "linear-gradient(135deg, var(--gold-soft), var(--gold))",
        }}
      />
    </div>
  )
}

export { Diamond }
