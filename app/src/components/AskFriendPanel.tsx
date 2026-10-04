import type { EventData, EventProgress } from "@tomelist/schema";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionKicker } from "@/components/ui/section-header";
import { askGroups, askText, askTotal, lineCost, type AskLine } from "@/lib/askFriend";
import { tokenCount, tomeCount } from "@/lib/format";

type CopyState = "idle" | "copied" | "manual";

function Lines({ lines, muted }: { lines: AskLine[]; muted?: boolean }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {lines.map((line) => (
        <li key={line.item.id} className="flex items-center gap-2 text-sm">
          {line.item.icon ? (
            <img src={line.item.icon} alt="" className="size-6 shrink-0 rounded-sm" />
          ) : (
            <span aria-hidden="true" className="size-6 shrink-0 rounded-sm border border-border bg-muted" />
          )}
          <span className={muted ? "min-w-0 flex-1 text-muted-foreground" : "min-w-0 flex-1"}>
            {line.item.name}
            {line.quantity > 1 ? ` ×${line.quantity}` : ""}
          </span>
          {muted ? null : <span className="shrink-0 tabular-nums text-gold">{lineCost(line)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function AskFriendPanel({
  event,
  wishlist,
}: {
  event: EventData;
  wishlist: EventProgress["wishlist"] | undefined;
}) {
  const groups = askGroups(event, wishlist);
  const text = askText(event.name, groups.ask);
  const total = askTotal(groups.ask);
  const [copy, setCopy] = useState<CopyState>("idle");
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (copy === "manual") fallbackRef.current?.select();
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copy]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("manual");
    }
  }

  return (
    <FramedCard data-testid="ask-friend-panel" id="ask-friend-panel" className="flex flex-col gap-4 p-4">
      {groups.ask.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to ask for yet. Want a tradeable item, and it shows up here as a list to send friends.
        </p>
      ) : (
        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Ask friends for</SectionKicker>
          <Lines lines={groups.ask} />
          <p className="flex justify-between border-t border-border pt-2 text-sm font-medium">
            <span>Total</span>
            <span data-testid="ask-total" className="tabular-nums text-gold">
              {tomeCount(total.tomes)}
              {total.tokens > 0 ? ` + ${tokenCount(total.tokens)}` : ""}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="action" size="sm" onClick={copyText}>
              {copy === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copy === "copied" ? "Copied" : "Copy list"}
            </Button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {copy === "copied" ? "Paste it in Discord or chat." : null}
            </span>
          </div>
          {copy === "manual" ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                Couldn't copy automatically. The text is selected: press Ctrl+C or ⌘C.
              </p>
              <textarea
                ref={fallbackRef}
                readOnly
                data-testid="ask-fallback"
                value={text}
                rows={groups.ask.length + 3}
                className="w-full rounded-md border border-input bg-surface-2 p-2 font-mono text-xs"
              />
            </div>
          ) : null}
        </section>
      )}
      {groups.covered.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Friends are covering</SectionKicker>
          <Lines lines={groups.covered} muted />
        </section>
      ) : null}
      {groups.earn.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">You'll need to earn these</SectionKicker>
          <p className="text-xs text-muted-foreground">Untradeable, so friends can't get them for you.</p>
          <Lines lines={groups.earn} muted />
        </section>
      ) : null}
    </FramedCard>
  );
}
