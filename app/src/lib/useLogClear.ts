import type { Objective } from "@tomelist/schema";
import { useUndoToast } from "@/components/UndoToast";
import { getEvent } from "@/lib/events";
import { tokenCount, tomeCount, undoClearBlockedReason } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export function useLogClear(eventId: string) {
  const recordObjective = useAppStore((s) => s.recordObjective);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const showToast = useUndoToast((s) => s.show);
  return (objective: Objective) => {
    const token = getEvent(eventId)?.token;
    const tokens = token ? (objective.tokens ?? 0) : 0;
    recordObjective(eventId, objective.id, objective.points, tokens);
    const earned = tokens > 0 ? `+${tomeCount(objective.points)}, +${tokenCount(tokens)}` : `+${tomeCount(objective.points)}`;
    showToast(
      `${earned} · ${objective.title}`,
      () => undoObjective(eventId, objective.id, objective.points, tokens),
      () => {
        const p = useAppStore.getState().events[eventId];
        return undoClearBlockedReason(p?.tomestones ?? 0, objective.points, p?.tokens ?? 0, tokens, token?.name);
      }
    );
  };
}
