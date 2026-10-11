import { useEffect } from "react";
import { create } from "zustand";
import { useAppStore } from "@/store/useAppStore";
import { createSyncClient, type SyncSocket, type SyncStatus } from "./sync";

export const useSyncStatus = create<{ status: SyncStatus | "off" }>(() => ({ status: "off" }));

function syncUrl(token: string) {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${location.host}/api/sync/${token}`;
}

function openWebSocket(url: string): SyncSocket {
  const ws = new WebSocket(url);
  const socket: SyncSocket = {
    send: (data) => ws.send(data),
    close: () => ws.close(),
    onopen: null,
    onmessage: null,
    onclose: null,
  };
  ws.onopen = () => socket.onopen?.();
  ws.onmessage = (event) => socket.onmessage?.({ data: String(event.data) });
  ws.onclose = () => socket.onclose?.();
  return socket;
}

// Mount once near the root. Runs a sync client while this device has a token.
export function useSync() {
  const token = useAppStore((s) => s.syncToken);
  useEffect(() => {
    if (!token) return;
    const client = createSyncClient({
      url: syncUrl(token),
      getState: () => {
        const { schemaVersion, settings, events, updatedAt, syncToken } = useAppStore.getState();
        return { schemaVersion, settings, events, updatedAt, syncToken };
      },
      subscribe: (listener) => useAppStore.subscribe(listener),
      adopt: (state) => useAppStore.getState().adoptRemoteState(state),
      openSocket: openWebSocket,
      onStatus: (status) => useSyncStatus.setState({ status }),
      onOnline: (listener) => {
        window.addEventListener("online", listener);
        return () => window.removeEventListener("online", listener);
      },
    });
    return () => {
      client.stop();
      useSyncStatus.setState({ status: "off" });
    };
  }, [token]);
}
