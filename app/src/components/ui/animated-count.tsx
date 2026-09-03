import { useEffect, useRef } from "react";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/utils";

/**
 * Renders a number that rolls to its new value (via useCountUp) and gives a
 * brief scale pop on every change after the first. Under prefers-reduced-motion
 * both effects are inert and it behaves like a plain `<span>{value}</span>`.
 */
export function AnimatedCount({
  value,
  format = String,
  className,
  ...props
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
} & Omit<React.ComponentProps<"span">, "children">) {
  const shown = useCountUp(value);
  const isFirst = useRef(true);
  useEffect(() => {
    isFirst.current = false;
  }, []);

  return (
    <span
      key={isFirst.current ? "init" : value}
      className={cn("inline-block", !isFirst.current && "animate-value-pop", className)}
      {...props}
    >
      {format(shown)}
    </span>
  );
}
