import { Link, useParams } from "@tanstack/react-router";
import { UnknownEvent } from "@/components/UnknownEvent";
import { BudgetSummary } from "@/components/BudgetSummary";
import { FirstRunCard } from "@/components/FirstRunCard";
import { RunNext } from "@/components/RunNext";
import { FramedCard } from "@/components/ui/framed-card";
import { TokenStepper, WalletStepper } from "@/components/WalletStepper";
import { Badge } from "@/components/ui/badge";
import { getEvent } from "@/lib/events";
import { weeklyPlan } from "@/lib/optimizer";
import { emptyEventProgress } from "@tomelist/schema";
import { useAppStore } from "@/store/useAppStore";

export function OverviewPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const progress = useAppStore((s) => s.events[eventId]);
  const wishlist = progress?.wishlist;
  if (!event) return <UnknownEvent testId="overview-page" />;
  const plan = weeklyPlan(event, progress ?? emptyEventProgress(), new Date());
  const pace =
    plan.neededPerWeek === null
      ? null
      : plan.neededPerWeek === 0
        ? plan.mustTokensReachable
          ? ({ label: "Covered", variant: "tome" } as const)
          : null
        : plan.onPace
          ? ({ label: "On pace", variant: "tome" } as const)
          : ({ label: "Behind", variant: "gold-outline" } as const);
  const wanted = event.exchanges.filter((e) => wishlist?.[e.id]?.status === "wanted").map((e) => e.name);
  const savingFor =
    wanted.length <= 2 ? wanted.join(" and ") : `${wanted.slice(0, 2).join(", ")} and ${wanted.length - 2} more`;
  return (
    <div data-testid="overview-page" className="flex flex-col gap-4">
      <FirstRunCard eventId={eventId} />
      <RunNext eventId={eventId} />
      <FramedCard className="flex flex-col gap-3 p-4">
        <WalletStepper eventId={eventId} />
        {event.token ? <TokenStepper eventId={eventId} name={event.token.name} /> : null}
        <p data-testid="saving-for" className="text-center text-sm text-muted-foreground">
          {wanted.length > 0 ? `Saving for ${savingFor}. ` : "No goal yet. "}
          <Link to="/$eventId/exchanges" params={{ eventId }} className="text-gold underline underline-offset-2 pointer-coarse:inline-block pointer-coarse:py-3.5 pointer-coarse:-my-3.5">
            {wanted.length > 0 ? "Edit" : "Pick items on Exchanges"}
          </Link>
        </p>
        {pace ? (
          <Link
            data-testid="overview-pace"
            to="/$eventId/planner"
            params={{ eventId }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground pointer-coarse:min-h-11"
          >
            <Badge variant={pace.variant}>{pace.label}</Badge>
            {plan.neededPerWeek ? `Earned ${plan.earnedThisWeek} of ~${plan.neededPerWeek} this week` : "Must-haves covered"}
          </Link>
        ) : null}
      </FramedCard>
      <BudgetSummary eventId={eventId} />
    </div>
  );
}
