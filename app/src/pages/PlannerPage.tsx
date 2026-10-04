import { useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
import { emptyEventProgress } from "@tomelist/schema";
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
import { budgetReport, weeklyPlan } from "@/lib/optimizer";
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
  const weekly = plan.minimogWeeks;
  const haveTokens = plan.tokens >= plan.mustTokenCost;
  const mustCost = budgetReport(event, eventProgress, now).tiers.find((t) => t.tier === "must")?.cumulativeCost ?? 0;

  return (
    <div data-testid="planner-page" className="flex flex-col gap-4">
      <FramedCard muted className="p-4">
        {plan.neededPerWeek === 0 && plan.mustTokensReachable ? (
          <div data-testid="pace-line" className="flex items-center justify-between gap-2">
            <span className="text-sm">
              {eventProgress.tomestones >= mustCost && haveTokens
                ? "You have enough for your Must-haves."
                : plan.mustTokenCost > 0
                  ? "The clears you have left cover your Must-haves."
                  : "The one-time clears you have left cover your Must-haves."}{" "}
              Earned {plan.earnedThisWeek} this week.
            </span>
            <Badge variant="tome">Covered</Badge>
          </div>
        ) : plan.neededPerWeek === 0 ? (
          <p data-testid="pace-line" className="text-sm">
            Tomes for your Must-haves are covered. Earned {plan.earnedThisWeek} this week.
          </p>
        ) : plan.neededPerWeek !== null ? (
          <div data-testid="pace-line" className="flex items-center justify-between gap-2">
            <span className="text-sm">
              Earned {plan.earnedThisWeek} / need ~{plan.neededPerWeek} this week
            </span>
            {plan.onPace ? <Badge variant="tome">On pace</Badge> : <Badge variant="destructive">Behind</Badge>}
          </div>
        ) : (
          <p data-testid="pace-line" className="text-sm text-muted-foreground">
            No weekly target yet. Earned {plan.earnedThisWeek} this week.
          </p>
        )}
        {event.token && plan.mustTokenCost > 0 ? (
          <p
            data-testid="token-line"
            className={cn("mt-2 text-sm", plan.mustTokensReachable ? "text-muted-foreground" : "text-destructive")}
          >
            Tokens: {plan.tokens} of {plan.mustTokenCost}.
            {haveTokens || plan.tokensRemaining === null
              ? null
              : plan.mustTokensReachable
                ? ` ${plan.tokensRemaining} left to earn.`
                : ` Only ${plan.tokensRemaining} left to earn, so the Must-haves can't all be reached.`}
          </p>
        ) : null}
      </FramedCard>

      <section className="flex flex-col gap-2">
        <SectionKicker as="h2">
          {weekly ? `Minimog · Week ${Math.min(Math.max(plan.currentWeek, 1), weekly)} of ${weekly}` : "Minimog picks"}
        </SectionKicker>
        <FramedCard corners>
          {plan.suggestedMinimogs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {!weekly
                ? "Both picks used this week. New picks open at the weekly reset."
                : plan.currentWeek < 1
                  ? "Minimogs open when the event starts."
                  : plan.currentWeek >= weekly
                  ? "All Minimog weeks are done."
                  : "This week's Minimog is done. The next one opens at the weekly reset."}
            </p>
          ) : (
            plan.suggestedMinimogs.map(({ objective }, index) => (
              <Fragment key={objective.id}>
                {index > 0 ? <ListRowDivider /> : null}
                <ListRow data-testid={`pick-${objective.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{objective.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="tome">{tomeCount(objective.points)}</Badge>
                      <Badge variant="gold-outline">{objective.effort}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="action"
                    size="sm"
                    onClick={() => logClear(objective)}
                  >
                    Log clear
                  </Button>
                </ListRow>
              </Fragment>
            ))
          )}
        </FramedCard>
      </section>

      {plan.weeklies.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionKicker as="h2">Weeklies</SectionKicker>
          <FramedCard corners>
            {plan.weeklies.map(({ objective, doneThisWeek }, index) => (
              <Fragment key={objective.id}>
                {index > 0 ? <ListRowDivider /> : null}
                <ListRow data-testid={`weekly-${objective.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{objective.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="tome">{tomeCount(objective.points)}</Badge>
                    </div>
                  </div>
                  {doneThisWeek ? (
                    <Badge variant="gold-outline">Claimed</Badge>
                  ) : (
                    <Button
                      variant="action"
                      size="sm"
                      onClick={() => logClear(objective)}
                    >
                      Log clear
                    </Button>
                  )}
                </ListRow>
              </Fragment>
            ))}
          </FramedCard>
        </section>
      ) : null}
    </div>
  );
}
