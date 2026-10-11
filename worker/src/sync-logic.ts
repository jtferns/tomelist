import { syncMessageSchema, type SyncMessage, type UserState } from "@tomelist/schema";

export const MAX_MESSAGE_BYTES = 64 * 1024;

export interface MessageOutcome {
  store?: UserState;
  reply?: SyncMessage;
  broadcast?: SyncMessage;
}

const encoder = new TextEncoder();

// Whole-blob last-write-wins: a strictly newer updatedAt replaces what is
// stored and goes to every other device; anything else gets the stored
// state back so the sender catches up.
export function handleMessage(raw: string, stored: UserState | null): MessageOutcome {
  if (encoder.encode(raw).byteLength > MAX_MESSAGE_BYTES) {
    return { reply: { type: "error", reason: "too-large" } };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { reply: { type: "error", reason: "invalid" } };
  }
  const parsed = syncMessageSchema.safeParse(json);
  if (!parsed.success || parsed.data.type !== "state") {
    return { reply: { type: "error", reason: "invalid" } };
  }
  const { syncToken: _token, ...incoming } = parsed.data.state;
  const incomingAt = Date.parse(incoming.updatedAt);
  if (Number.isNaN(incomingAt)) return { reply: { type: "error", reason: "invalid" } };
  if (stored && incomingAt <= Date.parse(stored.updatedAt)) {
    return { reply: { type: "state", state: stored } };
  }
  return { store: incoming, broadcast: { type: "state", state: incoming } };
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const IDLE_TTL_MS = 90 * DAY_MS;

// When to move the idle-expiry alarm after a write, or null to leave it.
// Each setAlarm is a billed row write, so it moves at most once a day.
export function alarmDue(now: number, current: number | null): number | null {
  const target = now + IDLE_TTL_MS;
  return current === null || target - current >= DAY_MS ? target : null;
}
