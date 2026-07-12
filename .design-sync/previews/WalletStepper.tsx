import { WalletStepper, useAppStore } from "@tomelist/app";

// Seed a wallet so the non-empty cell shows a realistic mid-event balance.
// Delta-based so it stays 240 even though the store persists to localStorage
// across capture runs (a plain add would accumulate).
const store = useAppStore.getState();
store.addTomestones(
  "preview-midevent",
  240 - (store.events["preview-midevent"]?.tomestones ?? 0),
);

export function EmptyWallet() {
  return <WalletStepper eventId="preview-empty" />;
}

export function MidEventBalance() {
  return <WalletStepper eventId="preview-midevent" />;
}
