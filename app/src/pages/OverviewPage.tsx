import { useParams } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletStepper } from "@/components/WalletStepper";
import { getEvent, isEventEnded } from "@/lib/events";

export function OverviewPage() {
  const { eventId } = useParams({ from: "/$eventId" });
  const event = getEvent(eventId);
  if (!event) return <div data-testid="overview-page">Unknown event.</div>;
  const now = new Date();
  const ended = isEventEnded(event, now);
  return (
    <div data-testid="overview-page" className="flex flex-col gap-4">
      <header className="text-center">
        <h1 className="text-xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {ended
            ? "Event ended"
            : event.ends
              ? `Ends in ${formatDistanceToNowStrict(new Date(event.ends))}`
              : (event.endsLabel ?? "Ongoing")}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm text-muted-foreground">
            {event.tomestone.name}s
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletStepper eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
