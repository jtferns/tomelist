import { useParams } from "@tanstack/react-router";
import { emptyEventProgress } from "@tomelist/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm text-muted-foreground">Pace</CardTitle>
        </CardHeader>
        <CardContent>
          {plan.neededPerWeek !== null ? (
            <div data-testid="pace-line" className="flex items-center justify-between gap-2">
              <span className="text-sm">
                Earned {plan.earnedThisWeek} / need ~{plan.neededPerWeek} this week
              </span>
              {plan.onPace ? (
                <Badge variant="default">On pace</Badge>
              ) : (
                <Badge variant="destructive">Behind</Badge>
              )}
            </div>
          ) : (
            <div data-testid="pace-line" className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">No end date — no weekly target.</p>
              <p className="text-sm">Earned {plan.earnedThisWeek} this week</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm text-muted-foreground">Minimog picks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {plan.suggestedMinimogs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Both picks used this week.</p>
          ) : (
            plan.suggestedMinimogs.map(({ objective }) => (
              <div
                key={objective.id}
                data-testid={`pick-${objective.id}`}
                className="flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{objective.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary">{objective.points} tomes</Badge>
                    <Badge variant="outline">{objective.effort}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => recordObjective(eventId, objective.id, objective.points)}
                >
                  Did it
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {plan.weeklies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-sm text-muted-foreground">Weeklies</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {plan.weeklies.map(({ objective, doneThisWeek }) => (
              <div
                key={objective.id}
                data-testid={`weekly-${objective.id}`}
                className="flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{objective.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary">{objective.points} tomes</Badge>
                  </div>
                </div>
                {doneThisWeek ? (
                  <Badge variant="default">Claimed</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => recordObjective(eventId, objective.id, objective.points)}
                  >
                    Did it
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
