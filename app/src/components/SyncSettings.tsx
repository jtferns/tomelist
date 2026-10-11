import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "@/components/ui/section-header";
import { pairingUrl } from "@/lib/pairing";
import { useSyncStatus } from "@/lib/useSync";
import { useAppStore } from "@/store/useAppStore";
import { SyncQr } from "./SyncQr";

const statusText = {
  off: "Not connected",
  connecting: "Connecting…",
  connected: "Synced",
  offline: "Offline, will retry",
} as const;

export function SyncSettings() {
  const token = useAppStore((s) => s.syncToken);
  const startSyncGroup = useAppStore((s) => s.startSyncGroup);
  const setSyncToken = useAppStore((s) => s.setSyncToken);
  const status = useSyncStatus((s) => s.status);
  const [confirm, setConfirm] = useState<"rotate" | "stop" | null>(null);
  const [copied, setCopied] = useState(false);

  if (!token) {
    return (
      <section className="flex flex-col gap-2">
        <SectionKicker as="h2">Sync</SectionKicker>
        <p className="text-sm text-muted-foreground">
          Keep progress the same on your phone and computer. No account needed.
        </p>
        <div>
          <Button variant="outline" size="sm" onClick={startSyncGroup}>
            Turn on sync
          </Button>
        </div>
      </section>
    );
  }

  const link = pairingUrl(location.origin, token);
  return (
    <section className="flex flex-col gap-2">
      <SectionKicker as="h2">Sync</SectionKicker>
      <p data-testid="sync-status" className="text-sm text-muted-foreground">
        {statusText[status]}
      </p>
      <p className="text-sm text-muted-foreground">
        Scan this on your other device, or open the link there. Anyone with the link can see and
        change your progress.
      </p>
      <SyncQr url={link} />
      <p className="break-all font-mono text-xs text-muted-foreground">{link}</p>
      <div className="flex flex-wrap gap-2">
        {/* The clipboard API only exists in secure contexts (https, localhost). */}
        {navigator.clipboard ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(link).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className={confirm === "rotate" ? "border-destructive text-destructive" : undefined}
          onClick={() => {
            if (confirm !== "rotate") return setConfirm("rotate");
            startSyncGroup();
            setConfirm(null);
            setCopied(false);
          }}
          onBlur={() => setConfirm(null)}
        >
          {confirm === "rotate" ? "Tap again: other devices must pair again" : "New link"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={confirm === "stop" ? "border-destructive text-destructive" : undefined}
          onClick={() => {
            if (confirm !== "stop") return setConfirm("stop");
            setSyncToken(undefined);
            setConfirm(null);
            setCopied(false);
          }}
          onBlur={() => setConfirm(null)}
        >
          {confirm === "stop" ? "Tap again to stop" : "Stop syncing on this device"}
        </Button>
      </div>
    </section>
  );
}
