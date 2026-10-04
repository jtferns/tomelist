import type { Objective } from "@tomelist/schema";
import { useUndoToast } from "@/components/UndoToast";
import { clearReward } from "@/lib/clears";
import { getEvent } from "@/lib/events";
import { tokenCount, tomeCount, undoClearBlockedReason } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export function useLogClear(eventId: string) {
  const recordObjective = useAppStore((s) => s.recordObjective);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const showToast = useUndoToast((s) => s.show);
  return (objective: Objective) => {
    const token = getEvent(eventId)?.token;
    const countAfter = (useAppStore.getState().events[eventId]?.completedObjectives[objective.id]?.count ?? 0) + 1;
    const { points, tokens } = clearReward(objective, countAfter, Boolean(token));
    recordObjective(eventId, objective.id, points, tokens);
    const earned =
      objective.clears !== undefined && points === 0
        ? `${countAfter} of ${objective.clears} clears`
        : tokens > 0
          ? `+${tomeCount(points)}, +${tokenCount(tokens)}`
          : `+${tomeCount(points)}`;
    showToast(
      `${earned} · ${objective.title}`,
      () => undoObjective(eventId, objective.id, points, tokens),
      () => {
        const p = useAppStore.getState().events[eventId];
        return undoClearBlockedReason(p?.tomestones ?? 0, points, p?.tokens ?? 0, tokens, token?.name);
      }
    );
  };
}
