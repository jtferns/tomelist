import { emptyEventProgress } from "@tomelist/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { rankRunNext, runsToMustGoal, budgetReport } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

export function RunNext({ eventId }: { eventId: string }) {
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);

  if (!event) return null;

  const eventProgress = progress ?? emptyEventProgress();
  const now = new Date();
  const ranked = rankRunNext(event, eventProgress, now);
  const top3 = ranked.slice(0, 3);

  const report = budgetReport(event, eventProgress, now);
  const mustTier = report.tiers.find((tier) => tier.tier === "must");
  const showHint = (mustTier?.cumulativeCost ?? 0) > 0;
  const runs = showHint ? runsToMustGoal(event, eventProgress, now) : null;

  return (
    <Card data-testid="run-next">
      <CardHeader>
        <CardTitle className="text-center text-sm text-muted-foreground">Run next</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {top3.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">All caught up for now.</p>
        ) : (
          top3.map(({ objective }) => (
            <div key={objective.id} data-testid={`run-next-${objective.id}`} className="min-w-0">
              <p className="truncate font-medium">{objective.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="secondary">{objective.points} tomes</Badge>
                <Badge variant="outline">{objective.effort}</Badge>
              </div>
            </div>
          ))
        )}
        {showHint && runs !== 0 ? (
          <p data-testid="runs-to-goal" className="text-sm text-muted-foreground">
            {runs === null
              ? "Weekly income can't reach your Must goal"
              : `~${runs} runs to reach your Must goal`}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
