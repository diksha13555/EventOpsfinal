// A volunteer's duty state, shared by the volunteer screen (check in / out) and the administrator's page.
// openSince is when the current shift began (null when off duty); closedTodayMs is time from today's finished shifts.
export type ShiftState = { openSince: number | null; closedTodayMs: number };
export const NO_SHIFT: ShiftState = { openSince: null, closedTodayMs: 0 };

export const workedMs = (s: ShiftState, now: number) =>
  s.closedTodayMs + (s.openSince === null ? 0 : Math.max(0, now - s.openSince));

// 75 minutes -> "1h 15m", 9 minutes -> "9m"
export function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}
