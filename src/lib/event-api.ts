// The calls the browser can make to the server. Each one runs on the server only;
// the browser just receives the result. Every input is checked before it touches the database,
// and every call checks who is asking: for now these are all Administrator-only.
// (The Volunteer and Participant screens have their own calls in portal-api.ts.)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventData } from "./event-data";

export type ApiResult = { ok: true; data: EventData } | { ok: false; problem: string; hint: string };

const title = z.string().trim().min(1, "Please enter a title.").max(200);
const priority = z.enum(["High", "Medium", "Low"]);
const severity = z.enum(["Critical", "High", "Medium", "Low"]);
const status = z.enum(["Backlog", "In Progress", "Blocked", "Done"]);
const id = z.number().int().positive();
const due = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

// POST on purpose, so a browser or CDN can never hand back an old cached copy.
export const getEventData = createServerFn({ method: "POST" }).handler(async (): Promise<ApiResult> => {
  const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
  return a.guarded(["admin"], () => s.loadEventData());
});

export const addTaskApi = createServerFn({ method: "POST" })
  .validator(z.object({ title, priority, due }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
    return a.guarded(["admin"], () => s.createTask(data.title, data.priority, data.due));
  });

export const setTaskStatusApi = createServerFn({ method: "POST" })
  .validator(z.object({ id, status }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
    return a.guarded(["admin"], () => s.setTaskStatus(data.id, data.status));
  });

export const addExpenseApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      categoryId: id,
      amount: z.number().int().min(1).max(10_000_000),
      note: z.string().max(200),
      spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }): Promise<ApiResult> => {
    const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
    return a.guarded(["admin"], () => s.createExpense(data.categoryId, data.amount, data.note, data.spentOn));
  });

export const addIssueApi = createServerFn({ method: "POST" })
  .validator(z.object({ title, severity }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
    return a.guarded(["admin"], () => s.createIssue(data.title, data.severity));
  });

export const resolveIssueApi = createServerFn({ method: "POST" })
  .validator(z.object({ id }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
    return a.guarded(["admin"], () => s.resolveIssue(data.id));
  });

// Deletes all event data, so it is Administrator-only like everything else here.
export const resetDemoDataApi = createServerFn({ method: "POST" }).handler(async (): Promise<ApiResult> => {
  const [a, s] = await Promise.all([import("../server/auth.server"), import("../server/event.server")]);
  return a.guarded(["admin"], () => s.resetDemoData());
});
