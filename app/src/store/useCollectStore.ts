import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OwnedImport } from "@/lib/collect";

// The last FFXIV Collect import. Device-local: kept out of the synced state.
export const useCollectStore = create<{
  imported: OwnedImport | null;
  setImported: (imported: OwnedImport) => void;
  forget: () => void;
}>()(
  persist(
    (set) => ({
      imported: null,
      setImported: (imported) => set({ imported }),
      forget: () => set({ imported: null }),
    }),
    { name: "tomelist:collect", version: 1 }
  )
);
