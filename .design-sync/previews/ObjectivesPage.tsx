import { ObjectivesPage, PreviewRouter } from "@tomelist/app";

// Objective list grouped by kind, with the category filter chip row (the
// sample event has 5 categories, so the chips render).
export function Objectives() {
  return (
    <PreviewRouter tab="objectives">
      <ObjectivesPage />
    </PreviewRouter>
  );
}
