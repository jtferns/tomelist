import { DurableObject } from "cloudflare:workers";

// One instance per sync token. Accepts the WebSocket for now; validation,
// persistence and broadcast land with Phase 3 Task 2.
export class SyncGroup extends DurableObject {
  async fetch(): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
}
