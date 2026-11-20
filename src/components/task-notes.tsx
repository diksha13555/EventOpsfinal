import { useState, type FormEvent } from "react";
import { fieldCls } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/event-selectors";
import type { TaskNote } from "@/lib/task-notes";

/*
  The note thread under a task. Volunteers and administrators both write in it, like a short conversation.
  onAdd answers null when the note was saved, or a message to show under the box.
*/
export function TaskNotes({
  notes,
  now,
  onAdd,
}: {
  notes: TaskNote[];
  now: number;
  onAdd: (body: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!text.trim()) return setError("Write a note first.");
    setBusy(true);
    setError(null);
    const problem = await onAdd(text.trim());
    setBusy(false);
    if (problem) return setError(problem);
    setText("");
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {open ? "Hide notes" : notes.length > 0 ? `Notes (${notes.length})` : "Add a note"}
      </button>

      {open && (
        <div className="mt-2 grid gap-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-md bg-muted/60 p-2.5">
              <p className="text-xs text-muted-foreground">
                {n.author}
                {n.role === "admin" && " (admin)"} · {timeAgo(now - n.at)} ago
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{n.body}</p>
            </div>
          ))}
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Write a note"
              aria-label="Write a note"
              className={`${fieldCls} h-9 flex-1 text-sm`}
            />
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Posting…" : "Post"}
            </Button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
