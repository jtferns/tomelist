import { z } from "zod";

export const objectiveSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["standard", "weekly", "minimog", "ultimog"]),
  title: z.string().min(1),
  category: z.string().min(1),
  points: z.number().int().positive(),
  effort: z.enum(["quick", "medium", "long"]),
  repeatable: z.union([z.boolean(), z.literal("weekly")]),
  requirement: z.string().optional(),
  notes: z.string().optional(),
  // Event week (1-based) a minimog belongs to. Untagged minimogs are open every week.
  week: z.number().int().positive().optional(),
  // Event-token award per clear, for events that define `token`.
  tokens: z.number().int().positive().optional(),
  // Clears needed before the reward is paid, e.g. 6 for "Clear Aloalo Island 6 times".
  clears: z.number().int().min(2).optional(),
});

export const exchangeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cost: z.number().int().positive(),
  type: z.string().min(1),
  tradeable: z.boolean().optional(),
  altSources: z.array(z.object({ type: z.string(), text: z.string() })).optional(),
  collectId: z.number().int().optional(),
  limited: z.boolean().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  eorzeadbUrl: z.string().url().optional(),
  // Event tokens per unit, on top of `cost`.
  tokenCost: z.number().int().positive().optional(),
});

export const eventSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-[a-z0-9-]+$/),
  name: z.string().min(1),
  tomestone: z.object({ name: z.string().min(1), icon: z.string().optional() }),
  // A second event currency, e.g. Uolon Horn Tokens. Absent on most events.
  token: z.object({ name: z.string().min(1), icon: z.string().optional() }).optional(),
  starts: z.string().datetime({ offset: true }).or(z.string().datetime()),
  ends: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable(),
  endsLabel: z.string().optional(),
  objectives: z.array(objectiveSchema).min(1),
  exchanges: z.array(exchangeSchema).min(1),
});

export const manifestSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      starts: z.string(),
      ends: z.string().nullable(),
    })
  ),
});

export type Objective = z.infer<typeof objectiveSchema>;
export type Exchange = z.infer<typeof exchangeSchema>;
export type EventData = z.infer<typeof eventSchema>;
export type EventManifest = z.infer<typeof manifestSchema>;
