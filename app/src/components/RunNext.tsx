import { Link } from "@tanstack/react-router";
import { emptyEventProgress } from "@tomelist/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { tomeCount } from "@/lib/format";
import { useLogClear } from "@/lib/useLogClear";
import { rankRunNext, runsToMustGoal, budgetReport } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

export function RunNext({ eventId }: { eventId: string }) {
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);
  const logClear = useLogClear(eventId);

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
    <FramedCard corners data-testid="run-next" className="flex flex-col gap-3 p-4">
      <SectionHeader title="Run next">
        <span className="text-xs text-muted-foreground">best tomes-per-effort right now</span>
      </SectionHeader>
      {top3.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">All caught up for now.</p>
      ) : (
        <div>
          {top3.map(({ objective }, index) => (
            <div key={objective.id}>
              {index > 0 ? <ListRowDivider /> : null}
              <ListRow data-testid={`run-next-${objective.id}`} className="justify-between">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium leading-snug">{objective.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
            </div>
          ))}
        </div>
      )}
      <Link
        to="/$eventId/planner"
        params={{ eventId }}
        data-testid="see-full-plan"
        className="text-sm text-gold underline underline-offset-2"
      >
        See full plan
      </Link>
      {showHint && runs !== 0 ? (
        <p data-testid="runs-to-goal" className="text-sm text-muted-foreground">
          {runs === null
            ? "Weekly income can't reach your Must goal"
            : `~${runs} runs to reach your Must goal`}
        </p>
      ) : null}
    </FramedCard>
  );
}
