import { PreviewRouter, SettingsPage } from "@tomelist/app";

// Theme picker (palette x mode) and event info. No seeding needed — renders
// from store defaults.
export function Settings() {
  return (
    <PreviewRouter tab="settings">
      <SettingsPage />
    </PreviewRouter>
  );
}
