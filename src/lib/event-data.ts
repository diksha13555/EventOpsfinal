// The shape of all event data, plus the sample data the demo starts with.
// Dates are built relative to "today" so the demo never goes stale.

export const EVENT_NAME = "Techfest 2026";

export type TaskStatus = "Backlog" | "In Progress" | "Blocked" | "Done";
export const TASK_STAGES: TaskStatus[] = ["Backlog", "In Progress", "Blocked", "Done"];

export type Priority = "High" | "Medium" | "Low";
export type Task = {
  id: number;
  title: string;
  owner: string;
  due: string; // "YYYY-MM-DD", or "" when no date
  priority: Priority;
  status: TaskStatus;
};

export type ResourceStatus = "Booked" | "Pending" | "Conflict" | "Free";
export type Resource = {
  id: number;
  name: string;
  kind: "venue" | "gear";
  slot: string;
  status: ResourceStatus;
};

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Issue = { id: number; title: string; severity: Severity; status: "Open" | "Resolved" };

export type BudgetLine = { head: string; spent: number; total: number };
export type ScheduleItem = { id: number; title: string; venue: string; at: number };
export type ActivityItem = { id: number; text: string; at: number };

export type EventState = {
  ready: boolean; // false until the browser has loaded the demo data
  eventStart: number;
  tasks: Task[];
  resources: Resource[];
  issues: Issue[];
  resolvedEarlier: number; // issues already resolved before this session
  budget: BudgetLine[];
  schedule: ScheduleItem[];
  activity: ActivityItem[];
};

export const EMPTY_STATE: EventState = {
  ready: false,
  eventStart: 0,
  tasks: [],
  resources: [],
  issues: [],
  resolvedEarlier: 0,
  budget: [],
  schedule: [],
  activity: [],
};

const HOUR = 3_600_000;

function isoDay(now: number, offsetDays: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function makeSeed(now: number): EventState {
  const start = new Date(now);
  start.setDate(start.getDate() + 4);
  start.setHours(9, 0, 0, 0);
  const eventStart = start.getTime();

  const t = (
    id: number,
    title: string,
    owner: string,
    dueOffset: number,
    priority: Priority,
    status: TaskStatus,
  ): Task => ({ id, title, owner, due: isoDay(now, dueOffset), priority, status });

  return {
    ready: true,
    eventStart,
    tasks: [
      t(1, "Print sponsor standees", "Riya", 3, "Medium", "Backlog"),
      t(2, "Book shuttle vans", "Arjun", 2, "Low", "Backlog"),
      t(3, "Order volunteer T-shirts", "Sara", 2, "Medium", "Backlog"),
      t(4, "Stage lighting rig plan", "Meera", -1, "High", "In Progress"),
      t(5, "Judge invites round 2", "Dev", 1, "Medium", "In Progress"),
      t(6, "Finalise hackathon problem statements", "Kabir", 2, "High", "In Progress"),
      t(7, "Wi-Fi uplink approval", "IT desk", 1, "High", "Blocked"),
      t(8, "Registration portal live", "Kabir", -6, "Low", "Done"),
      t(9, "Food stall contracts", "Sara", -7, "Low", "Done"),
      t(10, "Sound vendor confirmed", "Arjun", -5, "Medium", "Done"),
      t(11, "Poster design approved", "Riya", -4, "Low", "Done"),
      t(12, "Sponsor logos collected", "Riya", -3, "Low", "Done"),
      t(13, "Volunteer roster v1", "Meera", -3, "Medium", "Done"),
      t(14, "Medical desk arranged", "Dev", -2, "Medium", "Done"),
    ],
    resources: [
      { id: 1, name: "Main Auditorium", kind: "venue", slot: "Fri 09:00 – 18:00", status: "Booked" },
      { id: 2, name: "Open Air Ground", kind: "venue", slot: "Sat 16:00 – 23:00", status: "Conflict" },
      { id: 3, name: "Lab Block C", kind: "venue", slot: "Sat 08:00 – 20:00", status: "Free" },
      { id: 4, name: "Sound System A", kind: "gear", slot: "Fri – Sun", status: "Booked" },
      { id: 5, name: "LED Wall 12ft", kind: "gear", slot: "Sat only", status: "Pending" },
      { id: 6, name: "Seminar Hall 2", kind: "venue", slot: "Sun 10:00 – 14:00", status: "Free" },
    ],
    issues: [
      { id: 1, title: "Generator backup missing at Ground", severity: "High", status: "Open" },
      { id: 2, title: "Volunteer badges misprinted", severity: "Medium", status: "Open" },
      { id: 3, title: "Green room AC noisy", severity: "Low", status: "Open" },
    ],
    resolvedEarlier: 18,
    budget: [
      { head: "Stage & Sound", spent: 148000, total: 200000 },
      { head: "Hospitality", spent: 62000, total: 120000 },
      { head: "Marketing", spent: 41000, total: 60000 },
      { head: "Prizes", spent: 90000, total: 150000 },
    ],
    schedule: [
      { id: 1, title: "Opening ceremony", venue: "Main Auditorium", at: eventStart },
      { id: 2, title: "24-hour hackathon kickoff", venue: "Lab Block C", at: eventStart + 2 * HOUR },
      { id: 3, title: "Sponsor expo opens", venue: "Seminar Hall 2", at: eventStart + 6 * HOUR },
      { id: 4, title: "Cultural night", venue: "Open Air Ground", at: eventStart + 31 * HOUR },
    ],
    activity: [
      { id: 1, text: "Medical desk arranged moved to Done", at: now - 2 * HOUR },
      { id: 2, text: "Wi-Fi uplink approval moved to Blocked", at: now - 5 * HOUR },
      { id: 3, text: "Issue logged: Generator backup missing at Ground", at: now - 20 * HOUR },
    ],
  };
}
