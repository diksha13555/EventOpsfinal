// Server-only code for the administrator's view of volunteer work.
import type { PoolClient } from "pg";
import type { SessionUser } from "../lib/auth-types";
import type { Priority, TaskStatus } from "../lib/event-data";
import type { VolunteerOverview, VolunteerRow, VolunteerTask } from "../lib/volunteers-api";
import { getPool } from "./db.server";
import { NO_SHIFT } from "../lib/shift";
import { withEventSetup } from "./event.server";
import { NOTE_SELECT, SLOT_SELECT, toNote, toSlot, type NoteRow, type SlotRow } from "./rows.server";
import { TODAY_START } from "./time.server";

type TaskRow = Omit<VolunteerTask, "updatedAt"> & { updated_at: number; volunteer_id: number | null };

async function readOverview(): Promise<VolunteerOverview> {
  const db = getPool();
  const [people, tasks, shifts, notes, slots] = await Promise.all([
    db.query<{ id: number; name: string; email: string }>(
      `select id, name, email from users where role = 'volunteer' order by name, id`,
    ),
    // A task belongs to the volunteer it was assigned to. Older sample tasks that were never assigned to an
    // account still count for the volunteer whose name matches the owner.
    db.query<TaskRow>(
      `select t.id, t.title, t.owner, t.status, t.priority,
              coalesce(to_char(t.due, 'YYYY-MM-DD'), '') as due, t.note,
              floor(extract(epoch from t.updated_at) * 1000)::float8 as updated_at,
              coalesce(t.assignee_id,
                (select u.id from users u where u.role = 'volunteer' and lower(u.name) = lower(t.owner)
                  order by u.id limit 1)) as volunteer_id
         from tasks t
        order by (t.status = 'Done'), t.due nulls last, t.id`,
    ),
    // Duty state for everyone in one query: the open shift (if any) and time from today's finished shifts.
    db.query<{ user_id: number; closed_ms: number; open_since: number | null }>(
      `select user_id,
              coalesce(sum(extract(epoch from (checked_out_at - greatest(checked_in_at, ${TODAY_START}))) * 1000)
                       filter (where checked_out_at is not null and checked_out_at > ${TODAY_START}), 0)::float8 as closed_ms,
              max(floor(extract(epoch from checked_in_at) * 1000)) filter (where checked_out_at is null)::float8 as open_since
         from shifts group by user_id`,
    ),
    db.query<NoteRow>(`${NOTE_SELECT} order by n.id desc limit 300`),
    db.query<SlotRow>(`${SLOT_SELECT} where ends_at > now() - interval '1 day' order by starts_at limit 300`),
  ]);

  const rows = new Map<number, VolunteerRow>(people.rows.map((p) => [p.id, { ...p, tasks: [], shift: NO_SHIFT }]));
  for (const s of shifts.rows) {
    const person = rows.get(s.user_id);
    if (person) person.shift = { openSince: s.open_since, closedTodayMs: s.closed_ms };
  }
  const unassigned: VolunteerTask[] = [];
  for (const { volunteer_id, updated_at, ...t } of tasks.rows) {
    const task: VolunteerTask = { ...t, status: t.status as TaskStatus, priority: t.priority as Priority, updatedAt: updated_at };
    const owner = volunteer_id === null ? undefined : rows.get(volunteer_id);
    if (owner) owner.tasks.push(task);
    else unassigned.push(task);
  }
  return {
    volunteers: [...rows.values()],
    unassigned,
    notes: notes.rows.map(toNote),
    slots: slots.rows.map(toSlot),
  };
}

export function loadOverview(): Promise<VolunteerOverview> {
  return withEventSetup(readOverview);
}

async function inTransaction(work: (c: PoolClient) => Promise<void>): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await work(client);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function volunteerName(c: PoolClient, volunteerId: number): Promise<string> {
  const r = await c.query<{ name: string }>("select name from users where id = $1 and role = 'volunteer'", [volunteerId]);
  const name = r.rows[0]?.name;
  if (name === undefined) throw new Error("INVALID_VOLUNTEER");
  return name;
}

export async function assignTask(
  admin: SessionUser,
  taskId: number,
  volunteerId: number | null,
): Promise<VolunteerOverview> {
  await inTransaction(async (c) => {
    const name = volunteerId === null ? null : await volunteerName(c, volunteerId);
    const r = await c.query<{ event_id: number; title: string }>(
      `update tasks set assignee_id = $2, owner = $3, updated_at = now() where id = $1 returning event_id, title`,
      [taskId, volunteerId, name ?? "Unassigned"],
    );
    const task = r.rows[0];
    if (!task) throw new Error("NOT_FOUND");
    await c.query("insert into activity (event_id, text) values ($1, $2)", [
      task.event_id,
      name ? `${task.title} assigned to ${name} by ${admin.name}` : `${task.title} unassigned by ${admin.name}`,
    ]);
  });
  return loadOverview();
}

export async function createAssignedTask(
  admin: SessionUser,
  title: string,
  volunteerId: number,
  priority: Priority,
  due: string,
): Promise<VolunteerOverview> {
  await inTransaction(async (c) => {
    const name = await volunteerName(c, volunteerId);
    const ev = await c.query<{ id: number }>("select id from events order by id limit 1");
    const eventId = ev.rows[0]?.id;
    if (eventId === undefined) throw Object.assign(new Error("NO_EVENT"), { code: "42P01" });
    await c.query(
      `insert into tasks (event_id, title, owner, assignee_id, due, priority, status)
       values ($1, $2, $3, $4, nullif($5, '')::date, $6, 'Backlog')`,
      [eventId, title, name, volunteerId, due, priority],
    );
    await c.query("insert into activity (event_id, text) values ($1, $2)", [
      eventId,
      `Task assigned to ${name} by ${admin.name}: ${title}`,
    ]);
  });
  return loadOverview();
}

// An administrator writes in a task's note thread.
export async function addNote(admin: SessionUser, taskId: number, bodyInput: string): Promise<VolunteerOverview> {
  const body = bodyInput.trim();
  if (body.length < 1 || body.length > 500) throw new Error("NOTE_EMPTY");
  await inTransaction(async (c) => {
    const t = await c.query<{ event_id: number; title: string }>("select event_id, title from tasks where id = $1", [taskId]);
    const task = t.rows[0];
    if (!task) throw new Error("NOT_FOUND");
    await c.query("insert into task_notes (task_id, user_id, body) values ($1, $2, $3)", [taskId, admin.id, body]);
    await c.query("insert into activity (event_id, text) values ($1, $2)", [
      task.event_id,
      `Note on ${task.title} by ${admin.name}`,
    ]);
  });
  return loadOverview();
}

const MAX_SHIFT_MS = 16 * 60 * 60 * 1000;

// Plan a shift. Refuses times that make no sense, and a shift that overlaps another one for the same volunteer.
export async function addSlot(
  admin: SessionUser,
  volunteerId: number,
  startsAt: number,
  endsAt: number,
  place: string,
): Promise<VolunteerOverview> {
  if (!(endsAt > startsAt) || endsAt - startsAt > MAX_SHIFT_MS) throw new Error("SHIFT_INVALID");
  await inTransaction(async (c) => {
    const name = await volunteerName(c, volunteerId);
    const clash = await c.query(
      `select 1 from shift_slots
        where user_id = $1 and starts_at < to_timestamp($3::float8 / 1000) and ends_at > to_timestamp($2::float8 / 1000)`,
      [volunteerId, startsAt, endsAt],
    );
    if ((clash.rowCount ?? 0) > 0) throw new Error("SLOT_OVERLAP");
    await c.query(
      `insert into shift_slots (user_id, starts_at, ends_at, place)
       values ($1, to_timestamp($2::float8 / 1000), to_timestamp($3::float8 / 1000), $4)`,
      [volunteerId, startsAt, endsAt, place.trim()],
    );
    await c.query(`insert into activity (event_id, text) select id, $1::text from events order by id limit 1`, [
      `Shift planned for ${name} by ${admin.name}`,
    ]);
  });
  return loadOverview();
}

export async function removeSlot(slotId: number): Promise<VolunteerOverview> {
  const r = await getPool().query("delete from shift_slots where id = $1", [slotId]);
  if (r.rowCount === 0) throw new Error("NOT_FOUND");
  return loadOverview();
}
