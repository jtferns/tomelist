import { Link } from "@tanstack/react-router";
import { emptyEventProgress } from "@tomelist/schema";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Badge } from "@/components/ui/badge";
import { FramedCard } from "@/components/ui/framed-card";
import { ListRow, ListRowDivider } from "@/components/ui/list-row";
import { SectionKicker } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { budgetReport, type TierVerdict } from "@/lib/optimizer";
import { useAppStore } from "@/store/useAppStore";

const TIER_LABELS: Record<TierVerdict["tier"], string> = {
  must: "Must",
  want: "Nice",
  maybe: "Maybe",
};

function TierVerdictBadge({ tier, tokens }: { tier: TierVerdict; tokens: number }) {
  if (tier.affordableNow) {
    return <Badge variant="tome">Affordable now</Badge>;
  }
  // Tomes are in hand or due from one-time clears; only tokens are missing.
  if (tier.weeksNeeded === 0 && tier.affordableByEnd !== false && tokens < tier.tokenCost) {
    return <Badge variant="gold-outline">{tier.tokenCost - tokens} tokens to go</Badge>;
  }
  if (tier.weeksNeeded !== null && tier.affordableByEnd !== false) {
    return <Badge variant="gold-outline">~{tier.weeksNeeded} wk</Badge>;
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
  const coveredCount = Object.values(progress?.wishlist ?? {}).filter((e) => e.status === "covering").length;
  const coveredLine =
    coveredCount > 0 ? (
      <p data-testid="budget-covered" className="text-xs text-muted-foreground">
        {coveredCount === 1 ? "1 item a friend is covering" : `${coveredCount} items friends are covering`}, not
        counted here.
      </p>
    ) : null;

  if (visibleTiers.length === 0) {
    return (
      <FramedCard muted data-testid="budget-summary">
        <ListRow className="justify-between">
          <span className="text-sm text-muted-foreground">
            {coveredCount > 0 ? "Friends are covering everything you want." : "Nothing wishlisted yet."}
          </span>
          <Link
            to="/$eventId/exchanges"
            params={{ eventId }}
            className="rounded-sm text-sm text-gold outline-none hover:text-gold-soft focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Browse exchanges →
          </Link>
        </ListRow>
      </FramedCard>
    );
  }

  return (
    <FramedCard data-testid="budget-summary" className="flex flex-col gap-3 p-4">
      <SectionKicker>Budget</SectionKicker>
      <div>
        {visibleTiers.map((tier, index) => (
          <div key={tier.tier}>
            {index > 0 ? <ListRowDivider /> : null}
            <ListRow data-testid={`budget-tier-${tier.tier}`} className="justify-between">
              <span className="text-sm font-medium">{TIER_LABELS[tier.tier]}</span>
              <span className="text-sm text-gold tabular-nums">
                <AnimatedCount value={tier.cumulativeCost} format={(n) => n.toLocaleString()} />
                {tier.tokenCost > 0 ? (
                  <span data-testid={`budget-tokens-${tier.tier}`} className="text-muted-foreground">
                    {" "}
                    + {tier.tokenCost} tokens
                  </span>
                ) : null}
              </span>
              <TierVerdictBadge tier={tier} tokens={report.tokens} />
            </ListRow>
          </div>
        ))}
      </div>
      {coveredLine}
      <p className="text-xs text-muted-foreground">
        +{report.weeklyRate}/wk
        {report.weeksLeft !== null ? ` · ${report.weeksLeft} wk left` : ""}
      </p>
    </FramedCard>
  );
}
