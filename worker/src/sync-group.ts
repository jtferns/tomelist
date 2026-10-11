import { DurableObject } from "cloudflare:workers";
import type { SyncMessage, UserState } from "@tomelist/schema";
import type { Env } from "./env";
import { alarmDue, handleMessage } from "./sync-logic";

const STATE_KEY = "state";

// One instance per sync token. Uses the hibernation API, so idle sockets
// cost nothing between messages.
export class SyncGroup extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    // Kept on the socket so the write limit still knows the IP after hibernation.
    server.serializeAttachment({ ip: request.headers.get("CF-Connecting-IP") ?? "unknown" });
    const stored = await this.ctx.storage.get<UserState>(STATE_KEY);
    if (stored) send(server, { type: "state", state: stored });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    const stored = (await this.ctx.storage.get<UserState>(STATE_KEY)) ?? null;
    const outcome = handleMessage(raw, stored);
    if (outcome.store) {
      const { ip } = ws.deserializeAttachment() as { ip: string };
      const { success } = await this.env.SYNC_WRITES.limit({ key: ip });
      if (!success) return send(ws, { type: "error", reason: "rate-limited" });
      await this.ctx.storage.put(STATE_KEY, outcome.store);
      const next = alarmDue(Date.now(), await this.ctx.storage.getAlarm());
      if (next !== null) await this.ctx.storage.setAlarm(next);
    }
    if (outcome.reply) send(ws, outcome.reply);
    if (outcome.broadcast) {
      for (const peer of this.ctx.getWebSockets()) {
        if (peer !== ws) send(peer, outcome.broadcast);
      }
    }
  }

  // No writes for 90 days: drop the group. A device that reconnects later
  // uploads its own state again.
  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, "expired");
  }
}

function send(ws: WebSocket, message: SyncMessage) {
  ws.send(JSON.stringify(message));
}
