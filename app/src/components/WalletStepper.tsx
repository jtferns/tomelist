import { AnimatedCount } from "@/components/ui/animated-count";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

const STEP_BUTTON_CLASS = "min-h-11 min-w-11 hover:border-primary/60 hover:text-primary";

export function WalletStepper({ eventId }: { eventId: string }) {
  const tomestones = useAppStore((s) => (s.events[eventId] ?? { tomestones: 0 }).tomestones);
  const addTomestones = useAppStore((s) => s.addTomestones);
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label="Subtract 10 tomestones"
        onClick={() => addTomestones(eventId, -10)}
      >
        −10
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label="Subtract 1 tomestone"
        onClick={() => addTomestones(eventId, -1)}
      >
        −1
      </Button>
      <AnimatedCount
        data-testid="wallet-count"
        value={tomestones}
        className="min-w-20 text-center font-display text-4xl font-bold tabular-nums text-gold"
      />
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label="Add 1 tomestone"
        onClick={() => addTomestones(eventId, 1)}
      >
        +1
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label="Add 10 tomestones"
        onClick={() => addTomestones(eventId, 10)}
      >
        +10
      </Button>
    </div>
  );
}

export function TokenStepper({ eventId, name }: { eventId: string; name: string }) {
  const tokens = useAppStore((s) => s.events[eventId]?.tokens ?? 0);
  const addTokens = useAppStore((s) => s.addTokens);
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label={`Subtract 1 ${name}`}
        onClick={() => addTokens(eventId, -1)}
      >
        −1
      </Button>
      <div className="flex min-w-20 flex-col items-center">
        <AnimatedCount
          data-testid="token-count"
          value={tokens}
          className="font-display text-2xl font-bold tabular-nums text-gold"
        />
        <span className="text-xs text-muted-foreground">{name}s</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className={STEP_BUTTON_CLASS}
        aria-label={`Add 1 ${name}`}
        onClick={() => addTokens(eventId, 1)}
      >
        +1
      </Button>
    </div>
  );
}
