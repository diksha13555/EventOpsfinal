// Server-only code behind the Volunteer and Participant screens.
import type { Pool } from "pg";
import type { SessionUser } from "../lib/auth-types";
import type { Priority, Resource, Severity, TaskStatus } from "../lib/event-data";
import type { MyIssue, PortalHome } from "../lib/portal-api";
import { NO_SHIFT, formatDuration } from "../lib/shift";
import { WORK_FLOW, type WorkAction } from "../lib/task-flow";
import { getPool } from "./db.server";
import { withEventSetup } from "./event.server";
import { NOTE_SELECT, SLOT_SELECT, toNote, toSlot, type NoteRow, type SlotRow } from "./rows.server";
import { TODAY_START } from "./time.server";

const none = { rows: [] as never[] };
const codeOf = (err: unknown) => (err as { code?: string }).code;

async function read(db: Pool, user: SessionUser): Promise<PortalHome> {
  const volunteer = user.role === "volunteer";
  const [ev, schedule, tasks, open, closed, issues, venues, notes, slots] = await Promise.all([
    db.query<{ name: string; start_ms: number }>(
      `select name, floor(extract(epoch from starts_at) * 1000)::float8 as start_ms
         from events order by id limit 1`,
    ),
    db.query<{ id: number; title: string; venue: string; at: number }>(
      `select id, title, venue, floor(extract(epoch from starts_at) * 1000)::float8 as at
         from schedule_items order by starts_at`,
    ),
    // A volunteer's work is what an administrator assigned to their account. Older sample tasks that
    // were never assigned to an account still count when the owner name matches.
    volunteer
      ? db.query<{ id: number; title: string; owner: string; due: string; priority: Priority; status: TaskStatus; note: string }>(
          `select id, title, owner, coalesce(to_char(due, 'YYYY-MM-DD'), '') as due, priority, status, note
             from tasks
            where assignee_id = $2 or (assignee_id is null and lower(owner) = lower($1))
            order by (status = 'Done'), due nulls last, id`,
          [user.name, user.id],
        )
      : none,
    volunteer
      ? db.query<{ since: number }>(
          `select floor(extract(epoch from checked_in_at) * 1000)::float8 as since
             from shifts where user_id = $1 and checked_out_at is null`,
          [user.id],
        )
      : none,
    // Time from today's finished shifts. A shift that began before midnight only counts from midnight.
    volunteer
      ? db.query<{ ms: number }>(
          `select coalesce(sum(extract(epoch from (checked_out_at - greatest(checked_in_at, ${TODAY_START}))) * 1000), 0)::float8 as ms
             from shifts
            where user_id = $1 and checked_out_at is not null and checked_out_at > ${TODAY_START}`,
          [user.id],
        )
      : none,
    volunteer
      ? db.query<{ id: number; title: string; severity: Severity; status: "Open" | "Resolved"; at: number }>(
          `select id, title, severity, status, floor(extract(epoch from created_at) * 1000)::float8 as at
             from issues where reported_by = $1 order by id desc limit 10`,
          [user.id],
        )
      : none,
    volunteer
      ? db.query<Resource>(`select id, name, kind, slot, status from resources order by kind, id`)
      : none,
    // Note threads on the tasks that are mine (same rule as the task list above).
    volunteer
      ? db.query<NoteRow>(
          `${NOTE_SELECT} join tasks t on t.id = n.task_id
            where t.assignee_id = $2 or (t.assignee_id is null and lower(t.owner) = lower($1))
            order by n.id desc limit 200`,
          [user.name, user.id],
        )
      : none,
    // My planned shifts: the ones still to come, plus anything that ended in the last 12 hours.
    volunteer
      ? db.query<SlotRow>(
          `${SLOT_SELECT} where user_id = $1 and ends_at > now() - interval '12 hours' order by starts_at limit 20`,
          [user.id],
        )
      : none,
  ]);

  const event = ev.rows[0];
  if (!event) throw Object.assign(new Error("NO_EVENT"), { code: "42P01" }); // empty database: needs setup
  return {
    eventName: event.name,
    eventStart: event.start_ms,
    schedule: schedule.rows,
    myTasks: tasks.rows,
    shift: volunteer
      ? { openSince: open.rows[0]?.since ?? null, closedTodayMs: closed.rows[0]?.ms ?? 0 }
      : NO_SHIFT,
    myIssues: issues.rows satisfies MyIssue[],
    venues: venues.rows,
    notes: notes.rows.map(toNote),
    slots: slots.rows.map(toSlot),
  };
}

// If the database is new or out of date, sets it up first, like the admin screens do.
export function loadPortalHome(user: SessionUser): Promise<PortalHome> {
  return withEventSetup(() => read(getPool(), user));
}

// A volunteer moves one of THEIR OWN tasks forward. One statement checks ownership and that the move is
// allowed from the task's current status, so a stale screen or a hand-made request cannot skip the rules.
// The activity log line shows up on the Administrator Overview.
export async function updateTask(
  user: SessionUser,
  taskId: number,
  action: WorkAction,
  noteInput: string,
): Promise<PortalHome> {
  const flow = WORK_FLOW[action];
  const note = action === "block" ? noteInput.trim() : "";
  if (action === "block" && note.length < 3) throw new Error("NOTE_REQUIRED");
  const says = action === "block" ? ` blocked by ${user.name}: ${note}` : ` moved to ${flow.to} by ${user.name}`;

  const r = await getPool().query(
    `with moved as (
       update tasks set status = $3, note = $4, updated_at = now()
        where id = $1
          and status = any($5::text[])
          and (assignee_id = $2 or (assignee_id is null and lower(owner) = lower($6::text)))
        returning event_id, title
     )
     insert into activity (event_id, text)
     select event_id, title || $7::text from moved
     returning id`,
    [taskId, user.id, flow.to, note, flow.from, user.name, says],
  );
  if (r.rowCount === 0) throw new Error("TASK_CHANGED");
  return loadPortalHome(user);
}

// Start a shift. The database allows one open shift per volunteer, so a double tap cannot create two.
export async function checkIn(user: SessionUser): Promise<PortalHome> {
  try {
    await getPool().query(
      `with s as (insert into shifts (user_id) values ($1) returning id)
       insert into activity (event_id, text)
       select e.id, $2::text from events e order by e.id limit 1`,
      [user.id, `${user.name} checked in`],
    );
  } catch (err) {
    if (codeOf(err) === "23505") throw new Error("ALREADY_ON_DUTY");
    throw err;
  }
  return loadPortalHome(user);
}

export async function checkOut(user: SessionUser): Promise<PortalHome> {
  const db = getPool();
  const r = await db.query<{ minutes: number }>(
    `update shifts set checked_out_at = now()
      where user_id = $1 and checked_out_at is null
      returning floor(extract(epoch from (now() - checked_in_at)) / 60)::int as minutes`,
    [user.id],
  );
  const row = r.rows[0];
  if (!row) throw new Error("NOT_ON_DUTY");
  await db.query(`insert into activity (event_id, text) select id, $1::text from events order by id limit 1`, [
    `${user.name} checked out after ${formatDuration(row.minutes * 60_000)}`,
  ]);
  return loadPortalHome(user);
}

// A volunteer reports a problem on the ground. It lands in the administrator's Issues list and Overview,
// and the activity log says who reported it.
export async function reportIssue(user: SessionUser, title: string, severity: Severity): Promise<PortalHome> {
  const r = await getPool().query(
    `with ev as (select id from events order by id limit 1),
          i as (
            insert into issues (event_id, title, severity, reported_by)
            select id, $1, $2, $3 from ev
            returning event_id, title
          )
     insert into activity (event_id, text)
     select event_id, 'Issue logged by ' || $4::text || ': ' || title from i
     returning id`,
    [title, severity, user.id, user.name],
  );
  if (r.rowCount === 0) throw Object.assign(new Error("NO_EVENT"), { code: "42P01" });
  return loadPortalHome(user);
}

// A volunteer writes in the note thread of one of THEIR OWN tasks. The administrator sees it on the Volunteers page.
export async function addNote(user: SessionUser, taskId: number, bodyInput: string): Promise<PortalHome> {
  const body = bodyInput.trim();
  if (body.length < 1 || body.length > 500) throw new Error("NOTE_EMPTY");
  const r = await getPool().query(
    `with t as (
       select id, event_id, title from tasks
        where id = $1 and (assignee_id = $2 or (assignee_id is null and lower(owner) = lower($3::text)))
     ),
     n as (
       insert into task_notes (task_id, user_id, body) select id, $2, $4 from t returning task_id
     )
     insert into activity (event_id, text)
     select t.event_id, 'Note on ' || t.title || ' by ' || $3::text from t join n on n.task_id = t.id
     returning id`,
    [taskId, user.id, user.name, body],
  );
  if (r.rowCount === 0) throw new Error("TASK_CHANGED");
  return loadPortalHome(user);
}
