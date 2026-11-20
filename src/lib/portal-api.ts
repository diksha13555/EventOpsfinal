// The calls the Volunteer and Participant screens make. The server checks the role on every one.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Resource, ScheduleItem, Severity, Task } from "./event-data";
import type { ShiftState } from "./shift";
import type { ShiftSlot } from "./slots";
import { WORK_ACTIONS } from "./task-flow";
import type { TaskNote } from "./task-notes";

export type MyIssue = { id: number; title: string; severity: Severity; status: "Open" | "Resolved"; at: number };

// Only what a volunteer or participant may see: no budget, no sponsors, no other people's tasks.
// The last four fields are for volunteers; participants always get empty ones.
export type PortalHome = {
  eventName: string;
  eventStart: number;
  schedule: ScheduleItem[];
  myTasks: Task[];
  shift: ShiftState;
  myIssues: MyIssue[]; // issues this volunteer reported, newest first
  venues: Resource[]; // venues and gear, read only
  notes: TaskNote[]; // the note threads on my tasks (newest first)
  slots: ShiftSlot[]; // my planned shifts
};
export type PortalResult = { ok: true; data: PortalHome } | { ok: false; problem: string; hint: string };

const load = () => Promise.all([import("../server/auth.server"), import("../server/portal.server")]);

export const getPortalHomeApi = createServerFn({ method: "POST" }).handler(async (): Promise<PortalResult> => {
  const [a, p] = await load();
  return a.guarded(["volunteer", "participant"], (user) => p.loadPortalHome(user));
});

// Start, finish, block or resume one of my own tasks.
export const updateMyTaskApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().positive(),
      action: z.enum(WORK_ACTIONS),
      note: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data }): Promise<PortalResult> => {
    const [a, p] = await load();
    return a.guarded(["volunteer"], (user) => p.updateTask(user, data.id, data.action, data.note ?? ""));
  });

export const checkInApi = createServerFn({ method: "POST" }).handler(async (): Promise<PortalResult> => {
  const [a, p] = await load();
  return a.guarded(["volunteer"], (user) => p.checkIn(user));
});

export const checkOutApi = createServerFn({ method: "POST" }).handler(async (): Promise<PortalResult> => {
  const [a, p] = await load();
  return a.guarded(["volunteer"], (user) => p.checkOut(user));
});

export const reportIssueApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(3).max(200),
      severity: z.enum(["Critical", "High", "Medium", "Low"]),
    }),
  )
  .handler(async ({ data }): Promise<PortalResult> => {
    const [a, p] = await load();
    return a.guarded(["volunteer"], (user) => p.reportIssue(user, data.title, data.severity));
  });

// Add a note to one of my own tasks.
export const addMyNoteApi = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: z.number().int().positive(), body: z.string().max(2000) }))
  .handler(async ({ data }): Promise<PortalResult> => {
    const [a, p] = await load();
    return a.guarded(["volunteer"], (user) => p.addNote(user, data.taskId, data.body));
  });
