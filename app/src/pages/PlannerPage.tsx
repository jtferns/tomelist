import { useParams } from "@tanstack/react-router";
import { emptyEventProgress } from "@tomelist/schema";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { weeklyPlan } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

export function PlannerPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);
  const recordObjective = useAppStore((s) => s.recordObjective);

  if (!event) return <div data-testid="planner-page">Unknown event.</div>;

  const eventProgress = progress ?? emptyEventProgress();
  const now = new Date();
  const plan = weeklyPlan(event, eventProgress, now);

  return (
    <div data-testid="planner-page" className="flex flex-col gap-4">
      <FramedCard muted className="p-4">
        {plan.neededPerWeek !== null ? (
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
      </FramedCard>

      <section className="flex flex-col gap-2">
        <SectionKicker as="h2">Minimog picks</SectionKicker>
        <FramedCard corners>
          {plan.suggestedMinimogs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Both picks used this week.
            </p>
          ) : (
            plan.suggestedMinimogs.map(({ objective }, index) => (
              <Fragment key={objective.id}>
                {index > 0 ? <ListRowDivider /> : null}
                <ListRow data-testid={`pick-${objective.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{objective.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="tome">{objective.points} tomes</Badge>
                      <Badge variant="gold-outline">{objective.effort}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="action"
                    size="sm"
                    onClick={() => recordObjective(eventId, objective.id, objective.points)}
                  >
                    Did it
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
                    <p className="truncate font-medium">{objective.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="tome">{objective.points} tomes</Badge>
                    </div>
                  </div>
                  {doneThisWeek ? (
                    <Badge variant="gold-outline">Claimed</Badge>
                  ) : (
                    <Button
                      variant="action"
                      size="sm"
                      onClick={() => recordObjective(eventId, objective.id, objective.points)}
                    >
                      Did it
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
