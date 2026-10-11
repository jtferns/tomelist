import { routeApi } from "./route";

export { SyncGroup } from "./sync-group";

interface Env {
  SYNC_GROUP: DurableObjectNamespace;
}

// Only /api/* reaches this handler (run_worker_first); everything else is
// served from static assets with the SPA fallback.
export default {
  async fetch(request, env) {
    const route = routeApi(new URL(request.url).pathname);
    if (route.kind === "not-found") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }
    const stub = env.SYNC_GROUP.get(env.SYNC_GROUP.idFromName(route.token));
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
