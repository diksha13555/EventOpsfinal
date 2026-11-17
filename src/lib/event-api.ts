// The calls the browser can make to the server. Each one runs on the server only;
// the browser just receives the result. Every input is checked before it touches the database.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventData } from "./event-data";

export type ApiResult = { ok: true; data: EventData } | { ok: false; problem: string; hint: string };

const title = z.string().trim().min(1, "Please enter a title.").max(200);
const priority = z.enum(["High", "Medium", "Low"]);
const severity = z.enum(["Critical", "High", "Medium", "Low"]);
const status = z.enum(["Backlog", "In Progress", "Blocked", "Done"]);
const id = z.number().int().positive();
const amount = z.number().int().min(1, "Enter an amount above zero.").max(10_000_000, "That amount is too large.");
const note = z.string().trim().max(200);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const due = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

// POST on purpose, so a browser or CDN can never hand back an old cached copy.
export const getEventData = createServerFn({ method: "POST" }).handler(async (): Promise<ApiResult> => {
  const s = await import("../server/event.server");
  return s.safely(() => s.loadEventData());
});

export const addTaskApi = createServerFn({ method: "POST" })
  .validator(z.object({ title, priority, due }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const s = await import("../server/event.server");
    return s.safely(() => s.createTask(data.title, data.priority, data.due));
  });

export const moveTaskApi = createServerFn({ method: "POST" })
  .validator(z.object({ id, status, index: z.number().int().min(0).max(1000), reason: z.string().trim().max(200).optional() }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const s = await import("../server/event.server");
    return s.safely(() => s.moveTask(data.id, data.status, data.index, data.reason));
  });

export const addIssueApi = createServerFn({ method: "POST" })
  .validator(z.object({ title, severity }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const s = await import("../server/event.server");
    return s.safely(() => s.createIssue(data.title, data.severity));
  });

export const resolveIssueApi = createServerFn({ method: "POST" })
  .validator(z.object({ id }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const s = await import("../server/event.server");
    return s.safely(() => s.resolveIssue(data.id));
  });

export const addExpenseApi = createServerFn({ method: "POST" })
  .validator(z.object({ categoryId: id, amount, note, spentOn: isoDate }))
  .handler(async ({ data }): Promise<ApiResult> => {
    const s = await import("../server/event.server");
    return s.safely(() => s.createExpense(data.categoryId, data.amount, data.note, data.spentOn));
  });

export const resetDemoDataApi = createServerFn({ method: "POST" }).handler(async (): Promise<ApiResult> => {
  const s = await import("../server/event.server");
  return s.safely(() => s.resetDemoData());
});
