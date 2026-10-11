import { DurableObject } from "cloudflare:workers";
import type { SyncMessage, UserState } from "@tomelist/schema";
import { handleMessage } from "./sync-logic";

const STATE_KEY = "state";

// One instance per sync token. Uses the hibernation API, so idle sockets
// cost nothing between messages.
export class SyncGroup extends DurableObject {
  async fetch(): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    const stored = await this.ctx.storage.get<UserState>(STATE_KEY);
    if (stored) send(server, { type: "state", state: stored });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    const stored = (await this.ctx.storage.get<UserState>(STATE_KEY)) ?? null;
    const outcome = handleMessage(raw, stored);
    if (outcome.store) await this.ctx.storage.put(STATE_KEY, outcome.store);
    if (outcome.reply) send(ws, outcome.reply);
    if (outcome.broadcast) {
      for (const peer of this.ctx.getWebSockets()) {
        if (peer !== ws) send(peer, outcome.broadcast);
      }
    }
  }
}

function send(ws: WebSocket, message: SyncMessage) {
  ws.send(JSON.stringify(message));
}
