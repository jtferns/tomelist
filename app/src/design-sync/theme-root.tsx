import { useLayoutEffect, type ReactNode } from "react";

/**
 * Applies Tomelist's palette x mode theme attributes to the document root,
 * mirroring what Layout.tsx does at runtime. Component styling reads CSS
 * custom properties scoped to `:root[data-theme][data-palette]`
 * (see app/src/index.css), so nothing renders themed without this.
 * useLayoutEffect (not useEffect) so the attributes land before first paint —
 * a preview screenshot taken mid-flash would otherwise catch the unthemed frame.
 *
 * Wraps children in the same `bg-background text-foreground` surface
 * Layout.tsx puts on the real app shell: `body { background-color:
 * var(--color-background) }` in index.css only paints inside <body>'s own
 * box, which a preview's short content never fills, so outline/ghost
 * variants (styled for a dark page) would render against a blank white
 * capture canvas without this.
 */
export function ThemeRoot({
  theme = "dark",
  palette = "maelstrom",
  children,
}: {
  theme?: "dark" | "light";
  palette?: "maelstrom" | "adder" | "flames" | "ishgard" | "crystarium";
  children?: ReactNode;
}) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
  }, [theme, palette]);

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      {children}
    </div>
  );
}
