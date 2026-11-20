import type { Role } from "./auth-types";

// One message in a task's note thread.
export type TaskNote = { id: number; taskId: number; body: string; at: number; author: string; role: Role };

// Notes grouped by task, oldest first, ready to show as a conversation.
export function groupNotes(notes: TaskNote[]): Map<number, TaskNote[]> {
  const byTask = new Map<number, TaskNote[]>();
  for (const n of [...notes].sort((a, b) => a.id - b.id)) {
    const list = byTask.get(n.taskId);
    if (list) list.push(n);
    else byTask.set(n.taskId, [n]);
  }
  return byTask;
}
