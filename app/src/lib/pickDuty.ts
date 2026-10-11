/** A random duty from the list, never `previous` again unless it is the only one. */
export function pickDuty(duties: string[], previous: string | null, random: () => number = Math.random): string {
  const pool = duties.length > 1 && previous !== null ? duties.filter((d) => d !== previous) : duties;
  return pool[Math.floor(random() * pool.length)];
}
