import { eventSchema, type EventData } from "@tomelist/schema";

const modules = import.meta.glob("../../../data/events/*.json", { eager: true }) as Record<
  string,
  { default: unknown }
>;

const events: EventData[] = Object.values(modules)
  .map((m) => eventSchema.parse(m.default))
  .sort((a, b) => (a.starts < b.starts ? 1 : -1));

export function getAllEvents(): EventData[] {
  return events;
}

export function getEvent(id: string): EventData | undefined {
  return events.find((e) => e.id === id);
}

export function isEventEnded(event: EventData, now: Date): boolean {
  return event.ends !== null && new Date(event.ends) < now;
}

export function getActiveEvent(now: Date): EventData | undefined {
  const live = events.find(
    (e) => new Date(e.starts) <= now && (e.ends === null || new Date(e.ends) >= now)
  );
  return live ?? events[0];
}
