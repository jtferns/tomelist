import { Link, useParams } from "@tanstack/react-router";
import { BudgetSummary } from "@/components/BudgetSummary";
import { FirstRunCard } from "@/components/FirstRunCard";
import { RunNext } from "@/components/RunNext";
import { FramedCard } from "@/components/ui/framed-card";
import { WalletStepper } from "@/components/WalletStepper";
import { getEvent } from "@/lib/events";
import { useAppStore } from "@/store/useAppStore";

export function OverviewPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  const wishlist = useAppStore((s) => s.events[eventId]?.wishlist);
  if (!event) return <div data-testid="overview-page">Unknown event.</div>;
  const wanted = event.exchanges.filter((e) => wishlist?.[e.id]?.status === "wanted").map((e) => e.name);
  const savingFor =
    wanted.length <= 2 ? wanted.join(" and ") : `${wanted.slice(0, 2).join(", ")} and ${wanted.length - 2} more`;
  return (
    <div data-testid="overview-page" className="flex flex-col gap-4">
      <FirstRunCard eventId={eventId} />
      <RunNext eventId={eventId} />
      <FramedCard className="flex flex-col gap-3 p-4">
        <WalletStepper eventId={eventId} />
        <p data-testid="saving-for" className="text-center text-sm text-muted-foreground">
          {wanted.length > 0 ? `Saving for ${savingFor}. ` : "No goal yet. "}
          <Link to="/$eventId/exchanges" params={{ eventId }} className="text-gold underline underline-offset-2">
            {wanted.length > 0 ? "Edit" : "Pick items on Exchanges"}
          </Link>
        </p>
      </FramedCard>
      <BudgetSummary eventId={eventId} />
    </div>
  );
}
