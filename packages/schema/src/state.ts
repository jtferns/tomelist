import { z } from "zod";

export const themeSettingsSchema = z.object({
  palette: z.enum(["maelstrom", "adder", "flames", "ishgard", "crystarium"]),
  mode: z.enum(["dark", "light"]),
  ornament: z.enum(["full", "reduced", "minimal"]),
  density: z.enum(["comfy", "compact"]),
});

export const wishlistEntrySchema = z.object({
  status: z.enum(["wanted", "exchanged"]),
  tier: z.enum(["must", "want", "maybe"]),
  quantity: z.number().int().min(1),
});

export const eventProgressSchema = z.object({
  tomestones: z.number().int().min(0),
  // Event-token balance; absent means 0.
  tokens: z.number().int().min(0).optional(),
  // True once the player has set their starting wallet, including "starting at 0".
  walletSet: z.boolean().optional(),
  completedObjectives: z.record(
    z.string(),
    z.object({
      count: z.number().int().min(0),
      lastDoneAt: z.string(),
      // Earlier clear times, oldest first, so undo can restore lastDoneAt.
      history: z.array(z.string()).optional(),
    })
  ),
  minimogPicks: z.array(z.string()),
  wishlist: z.record(z.string(), wishlistEntrySchema),
});

export const userStateSchema = z.object({
  schemaVersion: z.literal(2),
  syncToken: z.string().optional(),
  settings: z.object({ theme: themeSettingsSchema }),
  events: z.record(z.string(), eventProgressSchema),
  updatedAt: z.string(),
});

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;
export type EventProgress = z.infer<typeof eventProgressSchema>;
export type UserState = z.infer<typeof userStateSchema>;

export const defaultTheme: ThemeSettings = {
  palette: "maelstrom",
  mode: "dark",
  ornament: "full",
  density: "comfy",
};

export function emptyEventProgress(): EventProgress {
  return { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} };
}
