// Loads every volunteer's work for the administrator, keeps it fresh, and runs the assign / add actions.
import { useCallback, useEffect, useRef, useState } from "react";
import { createUserApi } from "./auth-api";
import type { Priority } from "./event-data";
import {
  assignTaskApi,
  addAdminNoteApi,
  addShiftSlotApi,
  assignWorkApi,
  getVolunteerOverviewApi,
  removeShiftSlotApi,
  type OverviewResult,
  type VolunteerOverview,
} from "./volunteers-api";

type Problem = { problem: string; hint: string };
const NETWORK: Problem = { problem: "Could not reach the server.", hint: "Check your internet connection and try again." };

// Every action answers with null when it worked, or a message to show the person.
export type ActionOutcome = string | null;

export function useVolunteerOverview() {
  const [data, setData] = useState<VolunteerOverview | null>(null);
  const [error, setError] = useState<Problem | null>(null);
  const [now, setNow] = useState(0);
  const [saving, setSaving] = useState(false);
  const busy = useRef(0);
  const version = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const started = version.current;
    if (!quiet) setError(null);
    try {
      const r = await getVolunteerOverviewApi();
      if (quiet && (busy.current !== 0 || version.current !== started)) return;
      if (r.ok) setData(r.data);
      else if (!quiet) setError({ problem: r.problem, hint: r.hint });
    } catch {
      if (!quiet) setError(NETWORK);
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    void load();
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!document.hidden && busy.current === 0) void load(true); // picks up what volunteers just did
    }, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const run = useCallback(
    async (call: () => Promise<OverviewResult>): Promise<ActionOutcome> => {
      busy.current += 1;
      version.current += 1;
      setSaving(true);
      try {
        const r = await call();
        if (r.ok) {
          setData(r.data);
          return null;
        }
        void load(true);
        return `${r.problem} ${r.hint}`;
      } catch {
        return "That change could not be saved. Please try again.";
      } finally {
        busy.current -= 1;
        if (busy.current === 0) setSaving(false);
      }
    },
    [load],
  );

  return {
    data,
    error,
    now,
    saving,
    reload: () => load(),
    assign: (taskId: number, volunteerId: number | null) =>
      run(() => assignTaskApi({ data: { taskId, volunteerId } })),
    assignWork: (title: string, volunteerId: number, priority: Priority, due: string) =>
      run(() => assignWorkApi({ data: { title, volunteerId, priority, due } })),
    addNote: (taskId: number, body: string) => run(() => addAdminNoteApi({ data: { taskId, body } })),
    addSlot: (volunteerId: number, startsAt: number, endsAt: number, place: string) =>
      run(() => addShiftSlotApi({ data: { volunteerId, startsAt, endsAt, place } })),
    removeSlot: (slotId: number) => run(() => removeShiftSlotApi({ data: { slotId } })),
    addVolunteer: async (name: string, email: string, password: string): Promise<ActionOutcome> => {
      try {
        const r = await createUserApi({ data: { name, email, password, role: "volunteer" } });
        if (!r.ok) return `${r.problem} ${r.hint}`;
        await load(true);
        return null;
      } catch {
        return "That account could not be created. Please try again.";
      }
    },
  };
}
