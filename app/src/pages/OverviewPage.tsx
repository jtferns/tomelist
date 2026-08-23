import { useParams } from "@tanstack/react-router";
import { BudgetSummary } from "@/components/BudgetSummary";
import { RunNext } from "@/components/RunNext";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionKicker } from "@/components/ui/section-header";
import { WalletStepper } from "@/components/WalletStepper";
import { getEvent } from "@/lib/events";

export function OverviewPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  if (!event) return <div data-testid="overview-page">Unknown event.</div>;
  return (
    <div data-testid="overview-page" className="flex flex-col gap-4">
      <FramedCard corners className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <SectionKicker>{event.tomestone.name}s</SectionKicker>
          <span className="text-xs text-muted-foreground">Tap to adjust after each run</span>
        </div>
        <WalletStepper eventId={eventId} />
      </FramedCard>
      <BudgetSummary eventId={eventId} />
      <RunNext eventId={eventId} />
    </div>
  );
}
