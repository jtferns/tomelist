import { eventSchema, type EventData } from "@tomelist/schema";

type EventModules = Record<string, { default: unknown }>;

// Vite replaces this call with an object literal at build time. Under other
// bundlers (the design-sync esbuild IIFE), `import.meta.glob` doesn't exist
// and the call throws, leaving `globModules` empty. Events from
// `globalThis.__tomelistEventModules` are merged on top: the design-sync preview
// shim and the test setup register events there, and no real event id collides
// with them. In the production app nothing sets it, so this is a no-op.
let globModules: EventModules = {};
try {
  globModules = import.meta.glob("../../../data/events/*.json", { eager: true }) as EventModules;
} catch {
  // not running under Vite
}

declare global {
  // eslint-disable-next-line no-var
  var __tomelistEventModules: EventModules | undefined;
}

// Parsed lazily (first accessor call, i.e. render time) rather than at module
// evaluation, so a fallback registry assigned by a module that evaluates
// after this one is still picked up.
let events: EventData[] | undefined;

function allEvents(): EventData[] {
  if (!events) {
    const modules = { ...globModules, ...(globalThis.__tomelistEventModules ?? {}) };
    events = Object.values(modules)
      .map((m) => eventSchema.parse(m.default))
      .sort((a, b) => (a.starts < b.starts ? 1 : -1));
  }
  return events;
}

export function getAllEvents(): EventData[] {
  return allEvents();
}

export function getEvent(id: string): EventData | undefined {
  return allEvents().find((e) => e.id === id);
}

export function isEventEnded(event: EventData, now: Date): boolean {
  return event.ends !== null && new Date(event.ends) < now;
}

export function getActiveEvent(now: Date): EventData | undefined {
  const live = allEvents().find(
    (e) => new Date(e.starts) <= now && (e.ends === null || new Date(e.ends) >= now)
  );
  return live ?? allEvents()[0];
}
