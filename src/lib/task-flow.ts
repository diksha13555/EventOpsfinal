// What a volunteer may do to a task they were given. The screens use this to decide which buttons to show;
// the server uses the same table to refuse anything else (for example, reopening a finished task).
import type { TaskStatus } from "./event-data";

export type WorkAction = "start" | "done" | "block" | "resume";
export const WORK_ACTIONS = ["start", "done", "block", "resume"] as const;

export const WORK_FLOW: Record<WorkAction, { from: TaskStatus[]; to: TaskStatus; label: string }> = {
  start: { from: ["Backlog"], to: "In Progress", label: "Start" },
  done: { from: ["Backlog", "In Progress"], to: "Done", label: "Mark done" },
  block: { from: ["Backlog", "In Progress"], to: "Blocked", label: "I'm blocked" },
  resume: { from: ["Blocked"], to: "In Progress", label: "Resume" },
};

export function actionsFor(status: TaskStatus): WorkAction[] {
  return WORK_ACTIONS.filter((a) => WORK_FLOW[a].from.includes(status));
}
