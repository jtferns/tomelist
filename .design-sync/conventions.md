## Wrapping and setup

Every design MUST be wrapped in a root element carrying `data-theme` and `data-palette`
attributes — the whole token system is scoped to `:root[data-theme][data-palette]` selectors in
`styles.css`, and nothing renders themed without them:

```jsx
<div data-theme="dark" data-palette="maelstrom" className="min-h-screen bg-background p-4 text-foreground">
  {/* your design */}
</div>
```

- `data-theme`: `"dark"` (default) or `"light"`.
- `data-palette`: `"maelstrom"` (red, default), `"adder"` (green), or `"flames"` (yellow/orange) —
  these are the FFXIV Grand Company colors and only recolor `--primary`/`--accent`/`--ring`, not
  the neutral surface tokens.
- Always give the root `bg-background text-foreground` — component surfaces (`bg-card`, buttons,
  badges) are calibrated against the dark app background, and read poorly floating on a plain white
  canvas.

## Styling idiom

Tailwind v4 utility classes bound to CSS custom properties — never hand-roll hex/oklch colors.
Real token names, all present in `styles.css`:

| Utility | Token | Use |
|---|---|---|
| `bg-background` / `text-foreground` | `--background` / `--foreground` | page surface |
| `bg-card` / `text-card-foreground` | `--card` | card surfaces |
| `bg-primary` / `text-primary-foreground` | `--primary` | primary actions, active states |
| `bg-secondary` / `text-secondary-foreground` | `--secondary` | secondary badges/buttons |
| `text-muted-foreground` | `--muted-foreground` | de-emphasized text, meta rows |
| `hover:bg-accent` | `--accent` | hover states (plain `bg-accent` is not emitted) |
| `bg-destructive` | `--destructive` | destructive actions |
| `border-border` | `--border` | card/input borders |

Layout: `rounded-md`/`rounded-lg`/`rounded-xl` for corners, `gap-*`/`p-*`/`px-*`/`py-*` for
spacing — nothing custom, standard Tailwind scale. Caveat: the shipped CSS is compiled on-demand
from the app's own source, so **only utility classes the app already uses exist** — check
`_ds_bundle.css` before relying on a class not listed above. No dark-mode `dark:` variant classes needed on
top of these tokens — the token values themselves already flip with `data-theme`.

## Where the truth lives

- `styles.css` — the import entry; `@import`s the compiled Tailwind output (`_ds_bundle.css`),
  which holds every token and utility class actually used.
- Each component's `<Name>.prompt.md` — real usage docs synthesized from its props.

## Idiomatic build snippet

A dense list row, the actual pattern used throughout Tomelist's Objectives/Exchanges pages:

```jsx
<div data-theme="dark" data-palette="maelstrom" className="min-h-screen bg-background p-4 text-foreground">
  <Card className="max-w-sm">
    <CardContent className="flex items-center gap-3 p-3">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">Ehcatl Nine Zonureskin Coat</span>
        <div className="flex gap-1">
          <Badge variant="secondary">120 tomes</Badge>
          <Badge variant="outline">tradeable</Badge>
        </div>
      </div>
      <Button variant="outline" size="sm">−</Button>
      <span className="text-sm tabular-nums">1</span>
      <Button variant="outline" size="sm">+</Button>
    </CardContent>
  </Card>
</div>
```
