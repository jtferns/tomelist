import { useNavigate, useRouterState } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getAllEvents, getEvent, isEventEnded } from "@/lib/events";

const TABS = ["overview", "objectives", "exchanges", "settings"] as const;

export function EventSwitcher({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const event = getEvent(eventId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (!event) return null;
  const now = new Date();
  const ended = isEventEnded(event, now);
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "overview";
  const tab = (TABS as readonly string[]).includes(lastSegment) ? lastSegment : "overview";
  const statusLine = ended
    ? "Ended"
    : event.ends
      ? `ends in ${formatDistanceToNowStrict(new Date(event.ends))}`
      : (event.endsLabel ?? "Ongoing");

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 flex-col items-start rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent"
        data-testid="event-switcher-trigger"
      >
        <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          <span className="truncate">{event.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">{statusLine}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Switch event"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-lg"
        >
          {getAllEvents().map((e) => (
            <li key={e.id}>
              <button
                type="button"
                role="option"
                aria-selected={e.id === eventId}
                onClick={() => {
                  setOpen(false);
                  navigate({ to: `/$eventId/${tab}`, params: { eventId: e.id } });
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {isEventEnded(e, now) ? <Badge variant="outline">Ended</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
