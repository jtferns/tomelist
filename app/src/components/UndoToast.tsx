import { useEffect } from "react";
import { create } from "zustand";

const TOAST_MS = 5000;

type Toast = { id: number; message: string; onUndo: () => void };

type ToastState = {
  toast: Toast | null;
  show: (message: string, onUndo: () => void) => void;
  dismiss: () => void;
};

export const useUndoToast = create<ToastState>((set) => ({
  toast: null,
  show: (message, onUndo) => set({ toast: { id: Date.now(), message, onUndo } }),
  dismiss: () => set({ toast: null }),
}));

export function UndoToast() {
  const toast = useUndoToast((s) => s.toast);
  const dismiss = useUndoToast((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div
      role="status"
      data-testid="undo-toast"
      className="list-enter fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border border-gold bg-card px-4 py-3 text-sm shadow-lg sm:bottom-6"
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          toast.onUndo();
          dismiss();
        }}
        className="font-bold text-gold underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Undo
      </button>
    </div>
  );
}
