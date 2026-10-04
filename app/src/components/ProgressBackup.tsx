import { userStateSchema } from "@tomelist/schema";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

export function ProgressBackup({ eventId }: { eventId: string }) {
  const replaceState = useAppStore((s) => s.replaceState);
  const resetEvent = useAppStore((s) => s.resetEvent);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const event = getEvent(eventId);

  const exportProgress = () => {
    const { schemaVersion, settings, events, updatedAt } = useAppStore.getState();
    const blob = new Blob([JSON.stringify({ schemaVersion, settings, events, updatedAt }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tomelist-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (file: File) => {
    let parsed;
    try {
      parsed = userStateSchema.safeParse(JSON.parse(await file.text()));
    } catch {
      parsed = null;
    }
    if (!parsed?.success) {
      setMessage("That file isn't a Tomelist backup. Nothing was changed.");
      return;
    }
    replaceState(parsed.data);
    setMessage("Progress imported.");
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionKicker as="h2">Your progress</SectionKicker>
      <p className="text-sm text-muted-foreground">
        Saved on this device only. Export a backup to move it to another device or keep it safe.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportProgress}>
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Import progress file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importProgress(file);
            e.target.value = "";
          }}
        />
        {event ? (
          <Button
            variant="outline"
            size="sm"
            className={confirmReset ? "border-destructive text-destructive" : undefined}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true);
              resetEvent(event.id);
              setConfirmReset(false);
              setMessage(`Progress for ${event.name} was reset.`);
            }}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? "Tap again to reset" : "Reset this event"}
          </Button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
