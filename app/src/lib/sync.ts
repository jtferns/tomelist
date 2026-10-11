import { syncMessageSchema, type UserState } from "@tomelist/schema";

export type SyncStatus = "connecting" | "connected" | "offline";

// The slice of WebSocket the client uses, so tests can pass a fake.
export interface SyncSocket {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
}

export interface SyncDeps {
  url: string;
  getState: () => UserState;
  subscribe: (listener: () => void) => () => void;
  adopt: (state: UserState) => void;
  openSocket: (url: string) => SyncSocket;
  onStatus?: (status: SyncStatus) => void;
  onOnline?: (listener: () => void) => () => void;
}

const PUSH_DEBOUNCE_MS = 1000;
const FIRST_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;
const RATE_LIMIT_RETRY_MS = 10000;

// Keeps one device in step with its sync group. Whole-state last write wins:
// local changes are pushed after a short debounce, and a remote state is
// adopted only when its updatedAt is newer than ours.
export function createSyncClient(deps: SyncDeps): { stop: () => void } {
  let socket: SyncSocket | null = null;
  let connected = false;
  let stopped = false;
  let retryMs = FIRST_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  let lastSeen = deps.getState().updatedAt;

  const push = () => {
    clearTimeout(pushTimer);
    if (!connected || !socket) return;
    const { syncToken: _token, ...state } = deps.getState();
    socket.send(JSON.stringify({ type: "state", state }));
  };

  const receive = (data: string) => {
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      return;
    }
    const parsed = syncMessageSchema.safeParse(json);
    if (!parsed.success) return;
    if (parsed.data.type === "error") {
      // The server dropped our write; send the latest state again later.
      if (parsed.data.reason === "rate-limited") {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(push, RATE_LIMIT_RETRY_MS);
      }
      return;
    }
    const incoming = parsed.data.state;
    if (Date.parse(incoming.updatedAt) <= Date.parse(deps.getState().updatedAt)) return;
    lastSeen = incoming.updatedAt;
    deps.adopt(incoming);
  };

  const connect = () => {
    clearTimeout(retryTimer);
    if (stopped) return;
    deps.onStatus?.("connecting");
    const s = deps.openSocket(deps.url);
    socket = s;
    s.onopen = () => {
      connected = true;
      retryMs = FIRST_RETRY_MS;
      deps.onStatus?.("connected");
      push();
    };
    s.onmessage = (event) => receive(event.data);
    s.onclose = () => {
      if (socket !== s) return;
      connected = false;
      socket = null;
      if (stopped) return;
      deps.onStatus?.("offline");
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };
  };

  const unsubscribe = deps.subscribe(() => {
    const { updatedAt } = deps.getState();
    if (updatedAt === lastSeen) return;
    lastSeen = updatedAt;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, PUSH_DEBOUNCE_MS);
  });
  const stopOnline = deps.onOnline?.(() => {
    if (!socket) connect();
  });

  connect();

  return {
    stop: () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(pushTimer);
      unsubscribe();
      stopOnline?.();
      socket?.close();
      socket = null;
      connected = false;
    },
  };
}
