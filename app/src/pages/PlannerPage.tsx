import { useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
import { emptyEventProgress, type Objective } from "@tomelist/schema";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { cn } from "@/lib/utils";
import { tomeCount } from "@/lib/format";
import { useLogClear } from "@/lib/useLogClear";
import { budgetReport, weeklyPlan, type WeeklyPlan } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

export function PlannerPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);
  const logClear = useLogClear(eventId);

  if (!event) return <UnknownEvent testId="planner-page" />;

  const eventProgress = progress ?? emptyEventProgress();
  const now = new Date();
  const plan = weeklyPlan(event, eventProgress, now);
  const mustCost = budgetReport(event, eventProgress, now).tiers.find((t) => t.tier === "must")?.cumulativeCost ?? 0;

  return (
    <div data-testid="planner-page" className="flex flex-col gap-4">
      <FramedCard muted className="p-4">
        <PaceLine plan={plan} tomesCoverMust={eventProgress.tomestones >= mustCost} />
        {event.token && plan.mustTokenCost > 0 ? <TokenLine plan={plan} /> : null}
      </FramedCard>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <MinimogSection plan={plan} logClear={logClear} />
        {plan.weeklies.length > 0 ? <WeekliesSection plan={plan} logClear={logClear} /> : null}
      </div>
    </div>
  );
}

function coveredMessage(plan: WeeklyPlan, tomesCoverMust: boolean): string {
  const haveTokens = plan.tokens >= plan.mustTokenCost;
  if (tomesCoverMust && haveTokens) return "You have enough for your Must-haves.";
  if (plan.mustTokenTopUpCost > 0) {
    return tomesCoverMust
      ? "You have enough tomes for your Must-haves, including the tokens to buy."
      : "The clears you have left pay for your Must-haves, including the tokens to buy.";
  }
  if (plan.mustTokenCost > 0) return "The clears you have left cover your Must-haves.";
  return "The one-time clears you have left cover your Must-haves.";
}

function PaceLine({ plan, tomesCoverMust }: { plan: WeeklyPlan; tomesCoverMust: boolean }) {
  if (plan.neededPerWeek === 0 && plan.mustTokensReachable) {
    return (
      <div data-testid="pace-line" className="flex items-center justify-between gap-2">
        <span className="text-sm">
          {coveredMessage(plan, tomesCoverMust)} Earned {plan.earnedThisWeek} this week.
        </span>
        <Badge variant="tome">Covered</Badge>
      </div>
    );
  }
  if (plan.neededPerWeek === 0) {
    return (
      <p data-testid="pace-line" className="text-sm">
        Tomes for your Must-haves are covered. Earned {plan.earnedThisWeek} this week.
      </p>
    );
  }
  if (plan.neededPerWeek !== null) {
    return (
      <div data-testid="pace-line" className="flex items-center justify-between gap-2">
        <span className="text-sm">
          Earned {plan.earnedThisWeek} / need ~{plan.neededPerWeek} this week
        </span>
        {plan.onPace ? <Badge variant="tome">On pace</Badge> : <Badge variant="gold-outline">Behind</Badge>}
      </div>
    );
  }
  return (
    <p data-testid="pace-line" className="text-sm text-muted-foreground">
      No weekly target yet. Earned {plan.earnedThisWeek} this week.
    </p>
  );
}

function tokenNote(plan: WeeklyPlan): string | null {
  if (plan.tokens >= plan.mustTokenCost || plan.tokensRemaining === null) return null;
  if (plan.mustTokenTopUpCost > 0) {
    return ` ${plan.tokensRemaining} left to earn. Buy the rest for ${tomeCount(plan.mustTokenTopUpCost)}.`;
  }
  if (plan.mustTokensReachable) return ` ${plan.tokensRemaining} left to earn.`;
  return ` Only ${plan.tokensRemaining} left to earn, so the Must-haves can't all be reached.`;
}

function TokenLine({ plan }: { plan: WeeklyPlan }) {
  return (
    <p
      data-testid="token-line"
      className={cn("mt-2 text-sm", plan.mustTokensReachable ? "text-muted-foreground" : "text-destructive")}
    >
      Tokens: {plan.tokens} of {plan.mustTokenCost}.{tokenNote(plan)}
    </p>
  );
}

function minimogEmptyMessage(plan: WeeklyPlan): string {
  const weeks = plan.minimogWeeks;
  if (!weeks) return "Both picks used this week. New picks open at the weekly reset.";
  if (plan.currentWeek < 1) return "Minimogs open when the event starts.";
  if (plan.currentWeek >= weeks) return "All Minimog weeks are done.";
  return "This week's Minimog is done. The next one opens at the weekly reset.";
}

type LogClear = (objective: Objective) => void;

function MinimogSection({ plan, logClear }: { plan: WeeklyPlan; logClear: LogClear }) {
  const weeks = plan.minimogWeeks;
  return (
    <section className="flex flex-col gap-2">
      <SectionKicker as="h2">
        {weeks ? `Minimog · Week ${Math.min(Math.max(plan.currentWeek, 1), weeks)} of ${weeks}` : "Minimog picks"}
      </SectionKicker>
      <FramedCard corners>
        {plan.suggestedMinimogs.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{minimogEmptyMessage(plan)}</p>
        ) : (
          plan.suggestedMinimogs.map(({ objective }, index) => (
            <Fragment key={objective.id}>
              {index > 0 ? <ListRowDivider /> : null}
              <PlanRow
                testId={`pick-${objective.id}`}
                objective={objective}
                showEffort
                onLogClear={() => logClear(objective)}
              />
            </Fragment>
          ))
        )}
      </FramedCard>
    </section>
  );
}

function WeekliesSection({ plan, logClear }: { plan: WeeklyPlan; logClear: LogClear }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionKicker as="h2">Weeklies</SectionKicker>
      <FramedCard corners>
        {plan.weeklies.map(({ objective, doneThisWeek }, index) => (
          <Fragment key={objective.id}>
            {index > 0 ? <ListRowDivider /> : null}
            <PlanRow
              testId={`weekly-${objective.id}`}
              objective={objective}
              claimed={doneThisWeek}
              onLogClear={() => logClear(objective)}
            />
          </Fragment>
        ))}
      </FramedCard>
    </section>
  );
}

function PlanRow({
  testId,
  objective,
  showEffort = false,
  claimed = false,
  onLogClear,
}: {
  testId: string;
  objective: Objective;
  showEffort?: boolean;
  claimed?: boolean;
  onLogClear: () => void;
}) {
  return (
    <ListRow data-testid={testId}>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium leading-snug">{objective.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="tome">{tomeCount(objective.points)}</Badge>
          {showEffort ? <Badge variant="gold-outline">{objective.effort}</Badge> : null}
        </div>
      </div>
      {claimed ? (
        <Badge variant="gold-outline">Claimed</Badge>
      ) : (
        <Button variant="action-soft" size="sm" onClick={onLogClear}>
          Log clear
        </Button>
      )}
    </ListRow>
  );
}
