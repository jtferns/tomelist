import { useParams } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";
import type { Objective } from "@tomelist/schema";

const kindOrder = ["standard", "weekly", "minimog", "ultimog"] as const;
const kindLabels: Record<(typeof kindOrder)[number], string> = {
  standard: "Standard Objectives",
  weekly: "Weekly Objective",
  minimog: "Minimog Challenges",
  ultimog: "Ultimog Challenges",
};

function ObjectiveRow({ eventId, objective }: { eventId: string; objective: Objective }) {
  const count = useAppStore(
    (s) => s.events[eventId]?.completedObjectives[objective.id]?.count ?? 0
  );
  const recordObjective = useAppStore((s) => s.recordObjective);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const exhausted = objective.repeatable === false && count >= 1;
  return (
    <Card data-testid={`objective-${objective.id}`}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{objective.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="secondary">{objective.points} tomes</Badge>
            <Badge variant="outline">{objective.effort}</Badge>
            <span>{objective.category}</span>
            {objective.requirement ? <span>· {objective.requirement}</span> : null}
          </div>
        </div>
        <span data-testid="objective-count" className="text-lg font-bold tabular-nums">
          {count}
        </span>
        <Button
          size="sm"
          disabled={exhausted}
          onClick={() => recordObjective(eventId, objective.id, objective.points)}
        >
          {exhausted ? "Done" : "Did it"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Undo ${objective.title}`}
          disabled={count === 0}
          onClick={() => undoObjective(eventId, objective.id, objective.points)}
        >
          <RotateCcw className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ObjectivesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  if (!event) return <div data-testid="objectives-page">Unknown event.</div>;
  return (
    <div data-testid="objectives-page" className="flex flex-col gap-6">
      {kindOrder.map((kind) => {
        const group = event.objectives.filter((o) => o.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {kindLabels[kind]}
            </h2>
            {group.map((o) => (
              <ObjectiveRow key={o.id} eventId={eventId} objective={o} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
