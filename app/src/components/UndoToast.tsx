import { useEffect } from "react";
import { create } from "zustand";
import { useAppStore } from "@/store/useAppStore";

const TOAST_MS = 5000;

// blockedReason returns why undo isn't possible right now, or null when it is.
type Toast = { id: number; message: string; onUndo: () => void; blockedReason?: () => string | null };

type ToastState = {
  toast: Toast | null;
  show: (message: string, onUndo: () => void, blockedReason?: () => string | null) => void;
  dismiss: () => void;
};

export const useUndoToast = create<ToastState>((set) => ({
  toast: null,
  show: (message, onUndo, blockedReason) =>
    set({ toast: { id: Date.now(), message, onUndo, blockedReason } }),
  dismiss: () => set({ toast: null }),
}));

export function UndoToast() {
  const toast = useUndoToast((s) => s.toast);
  const dismiss = useUndoToast((s) => s.dismiss);
  // Re-render on progress changes so blockedReason stays current.
  useAppStore((s) => s.events);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  const blocked = toast.blockedReason?.() ?? null;
  return (
    <div
      role="status"
      data-testid="undo-toast"
      className="list-enter fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border border-gold bg-card px-4 py-3 text-sm shadow-lg sm:bottom-6"
    >
      <span>
        {toast.message}
        {blocked ? <span className="mt-0.5 block text-xs text-muted-foreground">{blocked}</span> : null}
      </span>
      <button
        disabled={blocked !== null}
        type="button"
        onClick={() => {
          toast.onUndo();
          dismiss();
        }}
        className="font-bold text-gold underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Undo
      </button>
    </div>
  );
}
