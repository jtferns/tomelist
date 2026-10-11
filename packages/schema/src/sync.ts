import { z } from "zod";
import { userStateSchema } from "./state";

// Messages on the /api/sync/<token> WebSocket. Both sides send "state";
// only the server sends "error".
export const syncMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state"), state: userStateSchema }),
  z.object({ type: z.literal("error"), reason: z.enum(["invalid", "too-large"]) }),
]);

export type SyncMessage = z.infer<typeof syncMessageSchema>;
