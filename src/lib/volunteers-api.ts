// Administrator-only calls: see every volunteer's work, assign it, and add volunteer accounts
// (adding accounts uses createUserApi from auth-api.ts).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Priority, TaskStatus } from "./event-data";
import type { ShiftState } from "./shift";
import type { ShiftSlot } from "./slots";
import type { TaskNote } from "./task-notes";

export type VolunteerTask = {
  id: number;
  title: string;
  owner: string;
  status: TaskStatus;
  priority: Priority;
  due: string; // "YYYY-MM-DD" or ""
  note: string; // the volunteer's reason while Blocked
  updatedAt: number; // when the status last changed
};
export type VolunteerRow = { id: number; name: string; email: string; tasks: VolunteerTask[]; shift: ShiftState };
export type VolunteerOverview = {
  volunteers: VolunteerRow[];
  unassigned: VolunteerTask[]; // tasks not given to a volunteer account yet
  notes: TaskNote[]; // note threads on tasks (newest first)
  slots: ShiftSlot[]; // planned shifts that are upcoming or ended in the last day
};
export type OverviewResult =
  | { ok: true; data: VolunteerOverview }
  | { ok: false; problem: string; hint: string };

const id = z.number().int().positive();

export const getVolunteerOverviewApi = createServerFn({ method: "POST" }).handler(
  async (): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], () => v.loadOverview());
  },
);

// Give an existing task to a volunteer, or take it back (volunteerId null).
export const assignTaskApi = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: id, volunteerId: id.nullable() }))
  .handler(async ({ data }): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], (admin) => v.assignTask(admin, data.taskId, data.volunteerId));
  });

// Create a brand-new task that is already assigned to a volunteer.
export const assignWorkApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(1, "Please enter a title.").max(200),
      volunteerId: id,
      priority: z.enum(["High", "Medium", "Low"]),
      due: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    }),
  )
  .handler(async ({ data }): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], (admin) =>
      v.createAssignedTask(admin, data.title, data.volunteerId, data.priority, data.due),
    );
  });

// Write in a task's note thread (the volunteer sees it on their screen).
export const addAdminNoteApi = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: id, body: z.string().max(2000) }))
  .handler(async ({ data }): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], (admin) => v.addNote(admin, data.taskId, data.body));
  });

// Plan a shift: when a volunteer is expected on duty. Times are moments in time (milliseconds).
export const addShiftSlotApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      volunteerId: id,
      startsAt: z.number().int(),
      endsAt: z.number().int(),
      place: z.string().trim().max(80),
    }),
  )
  .handler(async ({ data }): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], (admin) =>
      v.addSlot(admin, data.volunteerId, data.startsAt, data.endsAt, data.place),
    );
  });

export const removeShiftSlotApi = createServerFn({ method: "POST" })
  .validator(z.object({ slotId: id }))
  .handler(async ({ data }): Promise<OverviewResult> => {
    const [a, v] = await Promise.all([import("../server/auth.server"), import("../server/volunteers.server")]);
    return a.guarded(["admin"], () => v.removeSlot(data.slotId));
  });
