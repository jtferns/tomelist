import "@testing-library/jest-dom/vitest";
import { sampleEvent } from "@/test/fixtures/sample-event";

// Register the synthetic fixture event so tests resolve it through the real
// events pipeline without it being bundled under data/events/.
globalThis.__tomelistEventModules = {
  ...(globalThis.__tomelistEventModules ?? {}),
  [sampleEvent.id]: { default: sampleEvent },
};
