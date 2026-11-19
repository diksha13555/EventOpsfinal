// Loads what the Volunteer and Participant screens show, keeps it fresh, and runs the volunteer's actions.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkInApi,
  addMyNoteApi,
  checkOutApi,
  getPortalHomeApi,
  reportIssueApi,
  updateMyTaskApi,
  type PortalHome,
  type PortalResult,
} from "./portal-api";
import type { Severity } from "./event-data";
import type { WorkAction } from "./task-flow";

type Problem = { problem: string; hint: string };
const NETWORK: Problem = { problem: "Could not reach the server.", hint: "Check your internet connection and try again." };

export function usePortalHome() {
  const [data, setData] = useState<PortalHome | null>(null);
  const [error, setError] = useState<Problem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const busy = useRef(0); // changes being saved right now
  const version = useRef(0); // goes up on every change, so a slow background refresh cannot undo it

  // quiet = a background refresh: it never shows an error and never overwrites a newer change.
  const load = useCallback(async (quiet = false) => {
    const started = version.current;
    if (!quiet) setError(null);
    try {
      const r = await getPortalHomeApi();
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
    // Every 30 seconds: update the clock and pick up work the administrator has just assigned.
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!document.hidden && busy.current === 0) void load(true);
    }, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  // Runs one change. Answers null when it worked, or the message to show.
  const run = useCallback(
    async (call: () => Promise<PortalResult>): Promise<string | null> => {
      busy.current += 1;
      version.current += 1;
      let message: string | null = null;
      try {
        const r = await call();
        if (r.ok) setData(r.data);
        else message = `${r.problem} ${r.hint}`;
      } catch {
        message = "That change could not be saved. Please try again.";
      } finally {
        busy.current -= 1;
      }
      if (message) await load(true); // show what is really saved
      return message;
    },
    [load],
  );

  // Page-level actions show their problem in the banner at the top of the screen.
  const banner = useCallback(
    async (call: () => Promise<PortalResult>): Promise<boolean> => {
      setActionError(null);
      const message = await run(call);
      setActionError(message);
      return message === null;
    },
    [run],
  );

  return {
    data,
    error,
    actionError,
    now,
    reload: () => load(),
    act: (id: number, action: WorkAction, note = "") =>
      banner(() => updateMyTaskApi({ data: { id, action, note } })),
    checkIn: () => banner(() => checkInApi()),
    checkOut: () => banner(() => checkOutApi()),
    // A note box shows its own problem, so this one hands the message back instead.
    addNote: (taskId: number, body: string) => run(() => addMyNoteApi({ data: { taskId, body } })),
    // The report dialog shows its own problem, so this one hands the message back instead.
    reportIssue: (title: string, severity: Severity) => run(() => reportIssueApi({ data: { title, severity } })),
  };
}
