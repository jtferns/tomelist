import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function WalletStepper({ eventId }: { eventId: string }) {
  const tomestones = useAppStore((s) => (s.events[eventId] ?? { tomestones: 0 }).tomestones);
  const addTomestones = useAppStore((s) => s.addTomestones);
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, -10)}>-10</Button>
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, -1)}>-1</Button>
      </div>
      <div data-testid="wallet-count" className="min-w-24 text-center text-5xl font-bold tabular-nums">
        {tomestones}
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, 10)}>+10</Button>
        <Button variant="outline" size="lg" onClick={() => addTomestones(eventId, 1)}>+1</Button>
      </div>
    </div>
  );
}
