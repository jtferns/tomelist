import { useParams } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
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
    <ListRow data-testid={`objective-${objective.id}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{objective.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="tome">{objective.points} tomes</Badge>
          <Badge variant="gold-outline">{objective.effort}</Badge>
          <span>{objective.category}</span>
        </div>
        {objective.requirement ? (
          <p className="mt-1 text-xs text-muted-foreground">{objective.requirement}</p>
        ) : null}
      </div>
      <span
        data-testid="objective-count"
        className="font-display text-lg font-bold text-gold tabular-nums"
      >
        {count}
      </span>
      <Button
        variant="action"
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
        className="hover:text-gold"
        onClick={() => undoObjective(eventId, objective.id, objective.points)}
      >
        <RotateCcw className="size-4" />
      </Button>
    </ListRow>
  );
}

export function ObjectivesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const [category, setCategory] = useState<string | null>(null);
  if (!event) return <div data-testid="objectives-page">Unknown event.</div>;
  const categories = Array.from(new Set(event.objectives.map((o) => o.category)));
  const visibleObjectives = category
    ? event.objectives.filter((o) => o.category === category)
    : event.objectives;
  return (
    <div data-testid="objectives-page" className="flex flex-col gap-6">
      {categories.length >= 2 ? (
        <div data-testid="category-filters" className="flex flex-wrap items-center gap-1.5">
          <Chip
            active={category === null}
            data-testid="filter-all"
            onClick={() => setCategory(null)}
          >
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c}
              data-testid={`filter-${c}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      ) : null}
      {kindOrder.map((kind) => {
        const group = visibleObjectives.filter((o) => o.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-2">
            <SectionKicker as="h2">{kindLabels[kind]}</SectionKicker>
            <FramedCard corners>
              {group.map((o, index) => (
                <Fragment key={o.id}>
                  {index > 0 ? <ListRowDivider /> : null}
                  <ObjectiveRow eventId={eventId} objective={o} />
                </Fragment>
              ))}
            </FramedCard>
          </section>
        );
      })}
    </div>
  );
}
