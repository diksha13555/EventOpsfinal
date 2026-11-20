// Shared SQL and row shapes for notes and planned shifts, used by both the volunteer and administrator code.
import type { Role } from "../lib/auth-types";
import type { ShiftSlot } from "../lib/slots";
import type { TaskNote } from "../lib/task-notes";

export type NoteRow = { id: number; task_id: number; body: string; at: number; author: string; role: Role };
export const NOTE_SELECT = `select n.id, n.task_id, n.body,
       floor(extract(epoch from n.created_at) * 1000)::float8 as at, u.name as author, u.role
  from task_notes n join users u on u.id = n.user_id`;
export const toNote = (r: NoteRow): TaskNote => ({
  id: r.id,
  taskId: r.task_id,
  body: r.body,
  at: r.at,
  author: r.author,
  role: r.role,
});

export type SlotRow = { id: number; user_id: number; starts_at: number; ends_at: number; place: string };
export const SLOT_SELECT = `select id, user_id,
       floor(extract(epoch from starts_at) * 1000)::float8 as starts_at,
       floor(extract(epoch from ends_at) * 1000)::float8 as ends_at, place
  from shift_slots`;
export const toSlot = (r: SlotRow): ShiftSlot => ({
  id: r.id,
  userId: r.user_id,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  place: r.place,
});
