import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

// Decides what a pairing link should do before the app renders. Returns the
// token only when joining would replace progress, so the player is asked.
export function resolvePairingLink(token: string | null): string | null {
  if (!token) return null;
  const { syncToken, events, joinSyncGroup } = useAppStore.getState();
  if (token === syncToken) return null;
  if (Object.keys(events).length === 0) {
    joinSyncGroup(token);
    return null;
  }
  return token;
}

export function JoinSyncBanner({ token }: { token: string | null }) {
  const [pending, setPending] = useState(token);
  const joinSyncGroup = useAppStore((s) => s.joinSyncGroup);
  if (!pending) return null;
  return (
    <div
      data-testid="join-sync"
      role="alertdialog"
      aria-labelledby="join-sync-title"
      className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-md border border-[var(--frame-border)] bg-surface-2 p-4 shadow-lg sm:bottom-6"
    >
      <p id="join-sync-title" className="font-medium">
        Sync with your other device?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Progress on this device will be replaced by the synced progress.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="action"
          size="sm"
          onClick={() => {
            joinSyncGroup(pending);
            setPending(null);
          }}
        >
          Join
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPending(null)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
