import { useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
import { RotateCcw } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { tokenCount, tomeCount, undoClearBlockedReason } from "@/lib/format";
import { useLogClear } from "@/lib/useLogClear";
import { useAppStore } from "@/store/useAppStore";
import type { EventData, Objective } from "@tomelist/schema";

const kindOrder = ["standard", "weekly", "minimog", "ultimog"] as const;
const kindLabels: Record<(typeof kindOrder)[number], string> = {
  standard: "Standard Objectives",
  weekly: "Weekly Objective",
  minimog: "Minimog Challenges",
  ultimog: "Ultimog Challenges",
};

function ObjectiveRow({
  eventId,
  objective,
  token,
}: {
  eventId: string;
  objective: Objective;
  token: EventData["token"];
}) {
  const count = useAppStore(
    (s) => s.events[eventId]?.completedObjectives[objective.id]?.count ?? 0
  );
  const logClear = useLogClear(eventId);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const wallet = useAppStore((s) => s.events[eventId]?.tomestones ?? 0);
  const tokenBalance = useAppStore((s) => s.events[eventId]?.tokens ?? 0);
  const tokens = token ? (objective.tokens ?? 0) : 0;
  const undoBlocked =
    count > 0 ? undoClearBlockedReason(wallet, objective.points, tokenBalance, tokens, token?.name) : null;
  const exhausted = objective.repeatable === false && count >= 1;
  return (
    <ListRow data-testid={`objective-${objective.id}`} className="list-enter">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{objective.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="tome">{tomeCount(objective.points)}</Badge>
          {tokens > 0 ? (
            <Badge variant="gold-outline" data-testid="token-award" title={`+${tokenCount(tokens, token!.name)}`}>
              +{tokenCount(tokens)}
            </Badge>
          ) : null}
          <Badge variant="gold-outline">{objective.effort}</Badge>
          <span>{objective.category}</span>
        </div>
        {objective.requirement ? (
          <p className="mt-1 text-xs text-muted-foreground">{objective.requirement}</p>
        ) : null}
        {undoBlocked ? (
          <p data-testid="undo-blocked" className="mt-1 text-xs text-muted-foreground">
            {undoBlocked}
          </p>
        ) : null}
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Undo ${objective.title}`}
        disabled={count === 0 || undoBlocked !== null}
        className="hover:text-gold"
        onClick={() => undoObjective(eventId, objective.id, objective.points, tokens)}
      >
        <RotateCcw className="size-4" />
      </Button>
      <AnimatedCount
        data-testid="objective-count"
        value={count}
        className="font-display text-lg font-bold text-gold tabular-nums"
      />
      <Button
        variant="action"
        size="sm"
        disabled={exhausted}
        onClick={() => logClear(objective)}
      >
        {exhausted ? "Cleared" : "Log clear"}
      </Button>
    </ListRow>
  );
}

export function ObjectivesPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const [category, setCategory] = useState<string | null>(null);
  if (!event) return <UnknownEvent testId="objectives-page" />;
  const categories = Array.from(new Set(event.objectives.map((o) => o.category)));
  const visibleObjectives = category
    ? event.objectives.filter((o) => o.category === category)
    : event.objectives;
  return (
    <div data-testid="objectives-page" className="flex flex-col gap-6">
      {categories.length >= 2 ? (
        <div
          data-testid="category-filters"
          className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
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
                  <ObjectiveRow eventId={eventId} objective={o} token={event.token} />
                </Fragment>
              ))}
            </FramedCard>
          </section>
        );
      })}
    </div>
  );
}
