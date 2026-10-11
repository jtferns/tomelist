import { useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
import { Dices, RotateCcw } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Chip } from "@/components/ui/chip";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
import { clearReward, clearsNeeded } from "@/lib/clears";
import { getEvent } from "@/lib/events";
import { pickDuty } from "@/lib/pickDuty";
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
const kindHelp: Partial<Record<(typeof kindOrder)[number], string>> = {
  standard:
    "Moogle-marked duties show the moogle icon in the Duty Finder during the event. Any of them counts, as often as you like.",
  weekly: "The Mogpendium assigns one task each week. Claim it once per week.",
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
  // What undoing the latest clear would take back.
  const lastReward = clearReward(objective, count, Boolean(token));
  const undoBlocked =
    count > 0
      ? undoClearBlockedReason(wallet, lastReward.points, tokenBalance, lastReward.tokens, token?.name)
      : null;
  const exhausted = objective.repeatable === false && count >= clearsNeeded(objective);
  const [picked, setPicked] = useState<string | null>(null);
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
        {objective.notes ? (
          <p className="mt-1 text-xs text-muted-foreground">{objective.notes}</p>
        ) : null}
        {objective.duties ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            <button
              type="button"
              data-testid="pick-duty"
              onClick={() => setPicked(pickDuty(objective.duties!, picked))}
              className="inline-flex items-center gap-1 rounded-sm text-gold underline-offset-2 outline-none hover:text-gold-soft hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:-my-3 pointer-coarse:py-3"
            >
              <Dices className="size-3.5" aria-hidden />
              {picked ? "Pick another" : "Pick one for me"}
            </button>
            {picked ? (
              <span data-testid="picked-duty" aria-live="polite" key={picked} className="list-enter font-medium text-foreground">
                {picked}
              </span>
            ) : null}
          </p>
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
        onClick={() => undoObjective(eventId, objective.id, lastReward.points, lastReward.tokens)}
      >
        <RotateCcw className="size-4" />
      </Button>
      <span className="font-display text-lg font-bold text-gold tabular-nums">
        <AnimatedCount data-testid="objective-count" value={count} />
        {objective.clears ? (
          <span data-testid="objective-clears" className="text-sm text-muted-foreground">
            /{objective.clears}
          </span>
        ) : null}
      </span>
      <Button
        variant="action-soft"
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
          className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)]"
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
            {kindHelp[kind] ? (
              <p data-testid={`kind-help-${kind}`} className="text-sm text-muted-foreground">
                {kindHelp[kind]}
              </p>
            ) : null}
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
