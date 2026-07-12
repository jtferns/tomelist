import { emptyEventProgress } from "@tomelist/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEvent } from "@/lib/events";
import { budgetReport, type TierVerdict } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

const TIER_LABELS: Record<TierVerdict["tier"], string> = {
  must: "Must",
  want: "Want",
  maybe: "Maybe",
};

function TierVerdictBadge({ tier }: { tier: TierVerdict }) {
  if (tier.affordableNow) {
    return <Badge variant="default">Affordable now</Badge>;
  }
  if (tier.weeksNeeded !== null && tier.affordableByEnd !== false) {
    return <Badge variant="secondary">~{tier.weeksNeeded} wk</Badge>;
  }
  if (tier.affordableByEnd === false) {
    return <Badge variant="destructive">Out of reach</Badge>;
  }
  return <Badge variant="outline">No weekly income</Badge>;
}

export function BudgetSummary({ eventId }: { eventId: string }) {
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);

  if (!event) return null;

  const report = budgetReport(event, progress ?? emptyEventProgress(), new Date());
  const visibleTiers = report.tiers.filter((tier) => tier.cumulativeCost > 0);

  if (visibleTiers.length === 0) {
    return (
      <Card data-testid="budget-summary">
        <CardHeader>
          <CardTitle className="text-center text-sm text-muted-foreground">Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Add items to your wishlist to see affordability.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="budget-summary">
      <CardHeader>
        <CardTitle className="text-center text-sm text-muted-foreground">Budget</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {visibleTiers.map((tier) => (
          <div
            key={tier.tier}
            data-testid={`budget-tier-${tier.tier}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-sm font-medium">{TIER_LABELS[tier.tier]}</span>
            <span className="text-sm text-muted-foreground">
              {tier.cumulativeCost.toLocaleString()}
            </span>
            <TierVerdictBadge tier={tier} />
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          +{report.weeklyRate}/wk
          {report.weeksLeft !== null ? ` · ${report.weeksLeft} wk left` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
