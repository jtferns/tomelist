import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FramedCard } from "@/components/ui/framed-card";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export function FirstRunCard({ eventId }: { eventId: string }) {
  const progress = useAppStore((s) => s.events[eventId]);
  const confirmWallet = useAppStore((s) => s.confirmWallet);
  const steps = [
    {
      done: (progress?.tomestones ?? 0) > 0 || progress?.walletSet === true,
      label: (
        <>
          Enter the tomestones you have now, below, or{" "}
          <button
            type="button"
            onClick={() => confirmWallet(eventId)}
            className="text-gold underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            start at 0
          </button>
        </>
      ),
    },
    {
      done: Object.values(progress?.wishlist ?? {}).length > 0,
      label: (
        <>
          <Link to="/$eventId/exchanges" params={{ eventId }} className="text-gold underline underline-offset-2">
            Pick items you want
          </Link>{" "}
          on Exchanges. That sets your goal.
        </>
      ),
    },
    {
      done: Object.values(progress?.completedObjectives ?? {}).some((c) => c.count > 0),
      label: <>Run what Run Next suggests, then tap Log clear</>,
    },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <FramedCard data-testid="first-run" className="flex flex-col gap-3 p-4">
      <SectionHeader title="Getting started" />
      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={index} data-done={step.done} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border border-gold font-display text-xs text-gold",
                step.done && "bg-gold text-background"
              )}
            >
              {step.done ? <Check aria-label="Done" className="size-3.5" /> : index + 1}
            </span>
            <span className={cn("pt-0.5", step.done && "text-muted-foreground line-through")}>{step.label}</span>
          </li>
        ))}
      </ol>
    </FramedCard>
  );
}
