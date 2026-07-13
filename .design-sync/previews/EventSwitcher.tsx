import { EventSwitcher, PreviewRouter } from "@tomelist/app";

// Event name + status dropdown trigger (closed — the open listbox needs a
// pointer interaction the capture harness doesn't perform).
export function Trigger() {
  return (
    <PreviewRouter>
      <EventSwitcher eventId="2026-03-mogmog-collection" />
    </PreviewRouter>
  );
}
