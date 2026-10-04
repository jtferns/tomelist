// WCAG contrast verification for the palette×mode token blocks in index.css.
//
// No new dependency: this implements a minimal OKLCh -> linear-sRGB ->
// relative-luminance pipeline (Björn Ottosson's OKLab matrices) directly in
// the test file, per the task-9 brief (culori is not in node_modules).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS_PATH = path.resolve(process.cwd(), "src/index.css");
const css = readFileSync(CSS_PATH, "utf-8");

// --- oklch(L C H) -> relative luminance ------------------------------------

function oklchToLinearSrgb(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Colors outside the sRGB gamut can produce out-of-range linear channels;
  // clamp before computing luminance.
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [clamp(r), clamp(g), clamp(bLin)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function oklchStringToLuminance(input: string): number {
  // Matches "oklch(0.78 0.12 85)" or "oklch(0.78 0.12 85 / 0.1)" — alpha is
  // ignored (these are all opaque foreground/background tokens).
  const m = input.trim().match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`Cannot parse oklch() value: ${input}`);
  const [, lStr, cStr, hStr] = m;
  const l = Number(lStr);
  const c = Number(cStr);
  const h = Number(hStr);
  return relativeLuminance(oklchToLinearSrgb(l, c, h));
}

function contrastRatio(a: string, b: string): number {
  const la = oklchStringToLuminance(a);
  const lb = oklchStringToLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// --- known-answer anchors for the conversion itself -------------------------

describe("oklch -> luminance conversion (known answers)", () => {
  it("white is luminance 1", () => {
    expect(oklchStringToLuminance("oklch(1 0 0)")).toBeCloseTo(1, 2);
  });
  it("black is luminance 0", () => {
    expect(oklchStringToLuminance("oklch(0 0 0)")).toBeCloseTo(0, 2);
  });
  it("white on black is a 21:1 contrast ratio", () => {
    expect(contrastRatio("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 0);
  });
});

// --- parse the six token names we need out of index.css --------------------

const TOKENS = ["foreground", "background", "gold", "surface-2", "primary", "primary-foreground"] as const;
type TokenName = (typeof TOKENS)[number];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBlock(selector: string): Record<TokenName, string> {
  const blockMatch = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  if (!blockMatch) throw new Error(`Could not find CSS block for selector: ${selector}`);
  const body = blockMatch[1];
  const values = {} as Record<TokenName, string>;
  for (const name of TOKENS) {
    // Anchor on "--name:" (not "--name-foo:") so e.g. "--gold" doesn't match
    // "--gold-soft".
    const m = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
    if (m) values[name] = m[1].trim();
  }
  return values;
}

const modeBlocks = {
  dark: parseBlock(':root[data-theme="dark"]'),
  light: parseBlock(':root[data-theme="light"]'),
};

const palettes = ["maelstrom", "adder", "flames"] as const;
const modes = ["dark", "light"] as const;

function resolveCombo(palette: (typeof palettes)[number], mode: (typeof modes)[number]): Record<TokenName, string> {
  const paletteBlock = parseBlock(`:root[data-palette="${palette}"][data-theme="${mode}"]`);
  // Palette blocks only override primary/primary-foreground/accent/ring; the
  // rest (foreground, background, gold, surface-2) live solely in the base
  // mode block. Merge mode block first, palette overrides on top.
  return { ...modeBlocks[mode], ...paletteBlock };
}

describe("palette x mode contrast (WCAG)", () => {
  for (const palette of palettes) {
    for (const mode of modes) {
      const combo = resolveCombo(palette, mode);
      describe(`${palette} / ${mode}`, () => {
        it("foreground on background is >= 4.5:1", () => {
          const ratio = contrastRatio(combo.foreground, combo.background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
        it("gold on surface-2 is >= 3:1", () => {
          const ratio = contrastRatio(combo.gold, combo["surface-2"]);
          expect(ratio).toBeGreaterThanOrEqual(3);
        });
        // Button labels are 14px bold, below the large-text size, so they need 4.5:1.
        it("primary-foreground on primary is >= 4.5:1", () => {
          const ratio = contrastRatio(combo["primary-foreground"], combo.primary);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      });
    }
  }
});
