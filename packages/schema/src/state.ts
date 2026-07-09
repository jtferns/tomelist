import { z } from "zod";

export const wishlistEntrySchema = z.object({
  status: z.enum(["wanted", "exchanged"]),
  tier: z.enum(["must", "want", "maybe"]),
});

export const eventProgressSchema = z.object({
  tomestones: z.number().int().min(0),
  completedObjectives: z.record(
    z.string(),
    z.object({ count: z.number().int().min(0), lastDoneAt: z.string() })
  ),
  minimogPicks: z.array(z.string()),
  wishlist: z.record(z.string(), wishlistEntrySchema),
});

export const userStateSchema = z.object({
  schemaVersion: z.literal(1),
  syncToken: z.string().optional(),
  settings: z.object({ theme: z.string() }),
  events: z.record(z.string(), eventProgressSchema),
  updatedAt: z.string(),
});

export type WishlistEntry = z.infer<typeof wishlistEntrySchema>;
export type EventProgress = z.infer<typeof eventProgressSchema>;
export type UserState = z.infer<typeof userStateSchema>;

export function emptyEventProgress(): EventProgress {
  return { tomestones: 0, completedObjectives: {}, minimogPicks: [], wishlist: {} };
}
