import type { Objective } from "@tomelist/schema";
import { useUndoToast } from "@/components/UndoToast";
import { tomeCount } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export function useLogClear(eventId: string) {
  const recordObjective = useAppStore((s) => s.recordObjective);
  const undoObjective = useAppStore((s) => s.undoObjective);
  const showToast = useUndoToast((s) => s.show);
  return (objective: Objective) => {
    recordObjective(eventId, objective.id, objective.points);
    showToast(`+${tomeCount(objective.points)} · ${objective.title}`, () =>
      undoObjective(eventId, objective.id, objective.points)
    );
  };
}
