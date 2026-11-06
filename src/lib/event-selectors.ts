// Every number on screen is calculated here, from the shared data.
import type { EventState, Severity, Task } from "./event-data";

export const todayIso = (now: number) => {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDue(iso: string) {
  if (!iso) return "No date";
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

export const isOverdue = (task: Task, now: number) =>
  task.status !== "Done" && task.due !== "" && task.due < todayIso(now);

export function timeAgo(ms: number) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function countdown(ms: number) {
  const left = Math.max(0, ms);
  return {
    days: Math.floor(left / 86_400_000),
    hours: Math.floor((left % 86_400_000) / 3_600_000),
    minutes: Math.floor((left % 3_600_000) / 60_000),
  };
}

export const budgetPct = (spent: number, total: number) => Math.round((spent / total) * 100);

/*
  READINESS SCORE (0-100) = weighted average of four parts:
    Tasks    40%  share of tasks that are Done
    Bookings 25%  of the venues/gear someone asked for: Booked counts 1, Pending counts half,
                  Conflict counts 0  ("Free" means nobody asked for it, so it is left out)
    Issues   20%  starts at 100%, each open issue takes some off
                  (Critical 50, High 30, Medium 10, Low 5 points)
    Budget   15%  each category scores 1 under 85% spent, half from 85-100%, 0 if over budget
*/
const ISSUE_PENALTY: Record<Severity, number> = { Critical: 0.5, High: 0.3, Medium: 0.1, Low: 0.05 };

export function readinessBreakdown(s: EventState) {
  const tasks = s.tasks.length ? s.tasks.filter((t) => t.status === "Done").length / s.tasks.length : 1;

  const asked = s.resources.filter((r) => r.status !== "Free");
  const bookings = asked.length
    ? asked.reduce((sum, r) => sum + (r.status === "Booked" ? 1 : r.status === "Pending" ? 0.5 : 0), 0) /
      asked.length
    : 1;

  const penalty = s.issues
    .filter((i) => i.status === "Open")
    .reduce((sum, i) => sum + ISSUE_PENALTY[i.severity], 0);
  const issues = Math.max(0, 1 - penalty);

  const budget = s.budget.length
    ? s.budget.reduce((sum, b) => {
        const pct = budgetPct(b.spent, b.total);
        return sum + (pct > 100 ? 0 : pct >= 85 ? 0.5 : 1);
      }, 0) / s.budget.length
    : 1;

  const total = 0.4 * tasks + 0.25 * bookings + 0.2 * issues + 0.15 * budget;
  const pct = (n: number) => Math.round(n * 100);
  return { tasks: pct(tasks), bookings: pct(bookings), issues: pct(issues), budget: pct(budget), total: pct(total) };
}

export function quickStats(s: EventState) {
  const asked = s.resources.filter((r) => r.status !== "Free");
  const spent = s.budget.reduce((sum, b) => sum + b.spent, 0);
  const total = s.budget.reduce((sum, b) => sum + b.total, 0);
  return {
    openTasks: s.tasks.filter((t) => t.status !== "Done").length,
    bookingsConfirmed: asked.filter((r) => r.status === "Booked").length,
    bookingsAsked: asked.length,
    conflicts: s.resources.filter((r) => r.status === "Conflict").length,
    liveIssues: s.issues.filter((i) => i.status === "Open").length,
    resolvedIssues: s.resolvedEarlier + s.issues.filter((i) => i.status === "Resolved").length,
    budgetPct: total ? budgetPct(spent, total) : 0,
  };
}

export type AttentionTarget = "/admin/tasks" | "/admin/resources" | "/admin/issues" | "/admin/budget";
export type AttentionItem = {
  id: string;
  tone: "danger" | "warning";
  title: string;
  detail: string;
  to: AttentionTarget;
};

// The things an admin should look at first, most urgent first.
export function attentionItems(s: EventState, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];

  s.resources
    .filter((r) => r.status === "Conflict")
    .forEach((r) =>
      items.push({
        id: `res-${r.id}`,
        tone: "danger",
        title: `${r.name} has a booking conflict`,
        detail: r.slot,
        to: "/admin/resources",
      }),
    );

  s.issues
    .filter((i) => i.status === "Open" && (i.severity === "Critical" || i.severity === "High"))
    .forEach((i) =>
      items.push({
        id: `iss-${i.id}`,
        tone: "danger",
        title: i.title,
        detail: `${i.severity} severity issue`,
        to: "/admin/issues",
      }),
    );

  s.tasks
    .filter((t) => t.status === "Blocked")
    .forEach((t) =>
      items.push({
        id: `blk-${t.id}`,
        tone: "danger",
        title: `${t.title} is blocked`,
        detail: `Owner: ${t.owner}`,
        to: "/admin/tasks",
      }),
    );

  s.tasks
    .filter((t) => t.status !== "Blocked" && isOverdue(t, now))
    .forEach((t) =>
      items.push({
        id: `due-${t.id}`,
        tone: "warning",
        title: `${t.title} is overdue`,
        detail: `Was due ${formatDue(t.due)} · ${t.owner}`,
        to: "/admin/tasks",
      }),
    );

  s.budget.forEach((b) => {
    const pct = budgetPct(b.spent, b.total);
    if (pct >= 85)
      items.push({
        id: `bud-${b.head}`,
        tone: pct > 100 ? "danger" : "warning",
        title: `${b.head} has used ${pct}% of its budget`,
        detail: pct > 100 ? "Over budget" : "Close to the limit",
        to: "/admin/budget",
      });
  });

  s.resources
    .filter((r) => r.status === "Pending")
    .forEach((r) =>
      items.push({
        id: `pen-${r.id}`,
        tone: "warning",
        title: `${r.name} is waiting for confirmation`,
        detail: r.slot,
        to: "/admin/resources",
      }),
    );

  // Stable sort: urgent (danger) first, original order kept inside each group.
  return [...items].sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1));
}
