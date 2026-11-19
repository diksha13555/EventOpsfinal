// Planned shifts: when an administrator expects a volunteer on duty.
import { fromIso } from "./date-utils";

export type ShiftSlot = { id: number; userId: number; startsAt: number; endsAt: number; place: string };

const pad = (n: number) => String(n).padStart(2, "0");

// Every half hour of the day: { value: "09:30", label: "9:30 am" }
export const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return { value: `${pad(h)}:${pad(m)}`, label: `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? "am" : "pm"}` };
});

// A chosen day ("YYYY-MM-DD") plus two times ("HH:MM") become two moments in time, or null when
// the day is not real or the end is not after the start. (An overnight shift is entered as two shifts.)
export function slotTimes(dateIso: string, start: string, end: string): { startsAt: number; endsAt: number } | null {
  const day = fromIso(dateIso);
  if (!day) return null;
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h ?? 0, m ?? 0).getTime();
  };
  const startsAt = at(start);
  const endsAt = at(end);
  return endsAt > startsAt ? { startsAt, endsAt } : null;
}

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

// "Sat, 21 Nov, 9:00 am – 1:00 pm"
export function formatSlot(s: Pick<ShiftSlot, "startsAt" | "endsAt">): string {
  const day = new Date(s.startsAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time(s.startsAt)} – ${time(s.endsAt)}`;
}

export const currentSlot = (slots: ShiftSlot[], now: number) => slots.find((s) => s.startsAt <= now && now < s.endsAt);
export const nextSlot = (slots: ShiftSlot[], now: number) =>
  slots.filter((s) => s.startsAt > now).sort((a, b) => a.startsAt - b.startsAt)[0];
